var NS = "http://www.w3.org/2000/svg";
var TransformRequestObj;
var TransList;
// drag 대상 요소
var DragTarget = null;
var Dragging = false;
var DragStartGrabX = 0;
var DragStartGrabY = 0;
var DragChildrenPoints = [];
// <g> tag
var pgonG = document.getElementById('pgonG');
function getDragParentChildren(DragTarget) {
    //----set Parent/Children Polygons---
    PolygonDragParent = [];
    PolygonDragChildren = [];
    var myRect = document.getElementById('myRect');
    var myEllipse = document.getElementById('myEllipse');
    var myCircle = document.getElementById('myCircle');
    var myPolygon = document.getElementById('myPolygon');
    var myPath = document.getElementById('myPath');
    var myText = document.getElementById('myText');
    var myPolyline = document.getElementById('myPolyline');
    if (DragTarget.nodeName == "circle") {
        circle2Polygon(myCircle, "parent");
    }
    else if (DragTarget.nodeName == "rect") {
        rect2Polygon(myRect, "parent");
    }
    else if (DragTarget.nodeName == "ellipse") {
        ellipse2Polygon(myEllipse, "parent");
    }
    else if (DragTarget.nodeName == "path") {
        path2Polygon(myPath, "parent");
    }
    else if (DragTarget.nodeName == "polygon") {
        polygon2Polygon(myPolygon, "parent");
    }
    else if (DragTarget.nodeName == "text") {
        text2Polygon(myText, "parent");
    }
    else if (DragTarget.nodeName == "polyline") {
        polyline2Pgons(myPolyline, "parent");
    }
    //---creates polygon for each leg---
    if (DragTarget.nodeName != "circle")
        circle2Polygon(myCircle, "child");
    if (DragTarget.nodeName != "rect")
        rect2Polygon(myRect, "child");
    if (DragTarget.nodeName != "ellipse")
        ellipse2Polygon(myEllipse, "child");
    if (DragTarget.nodeName != "path")
        path2Polygon(myPath, "child");
    if (DragTarget.nodeName != "polygon")
        polygon2Polygon(myPolygon, "child");
    if (DragTarget.nodeName != "text")
        text2Polygon(myText, "child");
    if (DragTarget.nodeName != "polyline")
        polyline2Pgons(myPolyline, "child");
    //---creates polygon for each leg---
    DragChildrenPoints = [];
    for (var m = 0; m < PolygonDragChildren.length; m++) {
        var pgonChild = PolygonDragChildren[m];
        var shapeChild = pgonChild.id;
        var myElem = document.getElementById(pgonChild.getAttribute("myElem"));
        var bPoints = pgonChild.points;
        var n = bPoints.numberOfItems;
        var minusB = void 0;
        //---ignore 'close' leg of polygon---
        if (shapeChild.indexOf("pgonPolyline") != -1 || shapeChild == "pgonLine" || shapeChild == "pgonPathOpen" || shapeChild == "pgonPathOpenSmooth")
            minusB = -1;
        else
            minusB = 0;
        //--each side of polygon---
        for (var k = 0; k < n + minusB; k++) {
            var bX1 = bPoints.getItem(k).x;
            var bY1 = bPoints.getItem(k).y;
            var bX2 = void 0;
            var bY2 = void 0;
            if (k < n - 1) {
                bX2 = bPoints.getItem(k + 1).x;
                bY2 = bPoints.getItem(k + 1).y;
            }
            else {
                bX2 = bPoints.getItem(0).x;
                bY2 = bPoints.getItem(0).y;
            }
            DragChildrenPoints.push([myElem, [bX1, bY1, bX2, bY2]]);
        }
    }
}
// 요소 드래그 시, 동장
function startDrag(evt) {
    //---prevents dragging conflicts on other draggable elements---
    if (!Dragging) {
        if (evt.target.getAttribute("class") == "dragTarget") {
            DragTarget = evt.target;
            //---clear previous---
            for (var k = pgonG.childNodes.length - 1; k >= 0; k--) {
                console.log("k", pgonG.childNodes.item(k));
                pgonG.removeChild(pgonG.childNodes.item(k));
            }
            DragTarget.setAttribute("opacity", 1 + '');
            setTimeout(function () { return getDragParentChildren(DragTarget); }, 500);
            //---reference point to its respective viewport--
            var pnt = DragTarget.ownerSVGElement.createSVGPoint();
            pnt.x = evt.clientX;
            pnt.y = evt.clientY;
            //---elements transformed and/or in different(svg) viewports---
            var sCTM = DragTarget.getScreenCTM();
            var Pnt = pnt.matrixTransform(sCTM.inverse());
            TransformRequestObj = DragTarget.ownerSVGElement.createSVGTransform();
            //---attach new or existing transform to element, init its transform list---
            var myTransListAnim = DragTarget.transform;
            TransList = myTransListAnim.baseVal;
            //---the point on the element to grab as its dragging point---
            DragStartGrabX = Pnt.x;
            DragStartGrabY = Pnt.y;
            Dragging = true;
        }
    }
}
// 마우스 움직일 떄,
function drag(evt) {
    if (Dragging) {
        var pnt = DragTarget.ownerSVGElement.createSVGPoint();
        pnt.x = evt.clientX;
        pnt.y = evt.clientY;
        //---elements in different(svg) viewports, and/or transformed ---
        var sCTM = DragTarget.getScreenCTM();
        var Pnt = pnt.matrixTransform(sCTM.inverse());
        Pnt.x -= DragStartGrabX;
        Pnt.y -= DragStartGrabY;
        TransformRequestObj.setTranslate(Pnt.x, Pnt.y);
        TransList.appendItem(TransformRequestObj);
        TransList.consolidate();
        // 충돌 검사 시작.
        getCollisions(DragTarget, Pnt.x, Pnt.y);
    }
}
//--mouse up---
function endDrag() {
    Dragging = false;
}
//---dragging---
function getCollisions(DragTarget, transX, transY) {
    var collide = false;
    var collidedElems = [];
    for (var k = 0; k < PolygonDragParent.length; k++) {
        var pgonParent = PolygonDragParent[k];
        console.log('pgonParent', k, pgonParent.ownerSVGElement);
        var shapeParent = pgonParent.id;
        if (DragTarget.nodeName == "polygon")
            setTargetPnts(pgonParent, DragTarget);
        else {
            pgonParent.setAttribute("transform", "translate(" + transX + " " + transY + ")");
            ctmPolygon(pgonParent);
        }
        var aPoints = pgonParent.points;
        var m = aPoints.numberOfItems;
        var minusA = void 0;
        //---ignore 'close' leg of polygon---
        if (shapeParent.indexOf("pgonPolyline") != -1 || shapeParent == "pgonLine" || shapeParent == "pgonPathOpen" || shapeParent == "pgonPathOpenSmooth")
            minusA = -1;
        else
            minusA = 0;
        for (var i = 0; i < m + minusA; i++) {
            var aX1 = aPoints.getItem(i).x;
            var aY1 = aPoints.getItem(i).y;
            var aY2 = void 0;
            var aX2 = void 0;
            if (i < m - 1) {
                aX2 = aPoints.getItem(i + 1).x;
                aY2 = aPoints.getItem(i + 1).y;
            }
            else {
                aX2 = aPoints.getItem(0).x;
                aY2 = aPoints.getItem(0).y;
            }
            for (var p = 0; p < DragChildrenPoints.length; p++) {
                var child = DragChildrenPoints[p][0];
                var id = child.id;
                var childPnts = DragChildrenPoints[p][1];
                if (lineSegIntersect(aX1, aY1, aX2, aY2, childPnts[0], childPnts[1], childPnts[2], childPnts[3])) {
                    collide = true;
                    child.setAttribute("opacity", .4);
                    if (collidedElems.toString().indexOf(id) == -1)
                        collidedElems.push(id);
                }
                else if (child.getAttribute("opacity", .4)) {
                    for (var ce = 0; ce < collidedElems.length; ce++) {
                        var ceId = collidedElems[ce];
                        if (ceId == id) {
                            collidedElems.slice(ce, 1);
                            child.setAttribute("opacity", 1 + '');
                            break;
                        }
                    }
                }
            }
        }
    }
    for (var ce = 0; ce < collidedElems.length; ce++)
        document.getElementById(collidedElems[ce]).setAttribute("opacity", .4 + '');
    if (collide == false) {
        var dragElems = document.getElementsByClassName("dragTarget");
        for (var k = 0; k < dragElems.length; k++) {
            dragElems[k].setAttribute("opacity", 1 + '');
        }
    }
}
//---remove transform, create screen points for polygon---
function ctmPolygon(myPoly) {
    var ctm = myPoly.getCTM();
    // ts로 하니 null일 때가 발생
    var svgRoot = myPoly.ownerSVGElement;
    var pointsList = myPoly.points;
    var n = pointsList.numberOfItems;
    for (var m = 0; m < n; m++) {
        var mySVGPoint = svgRoot.createSVGPoint();
        mySVGPoint.x = pointsList.getItem(m).x;
        mySVGPoint.y = pointsList.getItem(m).y;
        var mySVGPointTrans = mySVGPoint.matrixTransform(ctm);
        pointsList.getItem(m).x = mySVGPointTrans.x;
        pointsList.getItem(m).y = mySVGPointTrans.y;
    }
    myPoly.removeAttribute("transform");
}
function setTargetPnts(pgonParent, DragTarget) {
    var ctm = DragTarget.getCTM();
    var svgRoot = DragTarget.ownerSVGElement;
    var pointsList = DragTarget.points;
    var pointsListParent = pgonParent.points;
    var n = pointsList.numberOfItems;
    for (var m = 0; m < n; m++) {
        var mySVGPoint = svgRoot.createSVGPoint();
        mySVGPoint.x = pointsList.getItem(m).x;
        mySVGPoint.y = pointsList.getItem(m).y;
        var mySVGPointTrans = mySVGPoint.matrixTransform(ctm);
        pointsListParent.getItem(m).x = mySVGPointTrans.x;
        pointsListParent.getItem(m).y = mySVGPointTrans.y;
    }
}
//---compare two lines: A.B---
function lineSegIntersect(aX1, aY1, aX2, aY2, bX1, bY1, bX2, bY2) {
    //---compute vectors Va, Vb--------
    var Va = ((bX2 - bX1) * (aY1 - bY1) - (bY2 - bY1) * (aX1 - bX1)) / ((bY2 - bY1) * (aX2 - aX1) - (bX2 - bX1) * (aY2 - aY1));
    var Vb = ((aX2 - aX1) * (aY1 - bY1) - (aY2 - aY1) * (aX1 - bX1)) / ((bY2 - bY1) * (aX2 - aX1) - (bX2 - bX1) * (aY2 - aY1));
    if (Va > 0 && Va < 1 && Vb > 0 && Vb < 1)
        return true;
    else
        return false;
}
var PolygonDragParent = [];
var PolygonDragChildren = [];
//=============Elements to Polygons===================
function polygon2Polygon(myPolygon, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonPolygon";
    pgon.setAttribute("myElem", "myPolygon");
    pgonG.appendChild(pgon);
    if (locale == "parent") {
        PolygonDragParent.push(pgon);
    }
    else
        PolygonDragChildren.push(pgon);
    pgon.setAttribute("points", myPolygon.getAttribute("points"));
    if (myPolygon.getAttribute("transform")) {
        var trfm = myPolygon.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}
function path2Polygon(myPath, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.setAttribute("myElem", "myPath");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    var pntStng = myPath.getAttribute("d");
    var id = '';
    if (pntStng.indexOf("z") != -1 || pntStng.indexOf("Z") != -1)
        id = "pgonPath";
    else
        id = "pgonPathOpen";
    //---is this a linear or smooth path?---
    var pathStng = myPath.getAttribute("d").toLowerCase();
    if ( //---smooth path--
    pathStng.indexOf("c") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("t") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("s") != -1
        || pathStng.indexOf("a") != -1)
        id += "Smooth";
    pgon.id = id;
    //---is path closed?---
    var d = myPath.getAttribute("d");
    var Z = "";
    if (d.indexOf("z") != -1)
        Z = "z";
    if (d.indexOf("Z") != -1)
        Z = "Z";
    var endLength = 0;
    if (Z == "z" || Z == "Z") {
        d = d.replace(Z, "");
        var tempPath = document.createElementNS(NS, 'path');
        tempPath.setAttribute("d", d);
        endLength = tempPath.getTotalLength();
    }
    else
        endLength = myPath.getTotalLength();
    pathStng = myPath.getAttribute("d").toLowerCase();
    //---smooth path--
    var pathSmooth;
    if (pathStng.indexOf("c") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("t") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("s") != -1
        || pathStng.indexOf("a") != -1)
        pathSmooth = true;
    else
        pathSmooth = false;
    if (pathSmooth) {
        var segCnt = 150;
        var pntList = pgon.points;
        var lengthDelta = endLength / segCnt;
        for (var k = 0; k < segCnt; k++) {
            var len = lengthDelta * k;
            if (len < endLength) {
                var pnt = myPath.getPointAtLength(len);
                pntList.appendItem(pnt);
            }
            else
                break;
        }
        //---straight path: create a polygon---
    }
    else {
        var len = myPath.getTotalLength();
        var p = myPath.getPointAtLength(0);
        var seg = myPath.getPathSegAtLength(0);
        var pnts = p.x + "," + p.y;
        for (var i = 1; i < len; i++) {
            p = myPath.getPointAtLength(i);
            if (myPath.getPathSegAtLength(i) > seg) {
                pnts = pnts + " " + p.x + "," + p.y;
                seg = myPath.getPathSegAtLength(i);
            }
        }
        pgon.setAttribute("points", pnts);
    }
    if (myPath.getAttribute("transform")) {
        pgon.setAttribute("transform", myPath.getAttribute("transform"));
        ctmPolygon(pgon);
    }
}
function rect2Polygon(myRect, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonRect";
    pgon.setAttribute("myElem", "myRect");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    var x = +myRect.getAttribute("x");
    var y = +myRect.getAttribute("y");
    var w = +myRect.getAttribute("width");
    var h = +myRect.getAttribute("height");
    var pnts1 = [x, y, x, y + h, x + w, y + h, x + w, y];
    pgon.setAttribute("points", pnts1.join());
    if (myRect.getAttribute("transform")) {
        pgon.setAttribute("transform", myRect.getAttribute("transform"));
        ctmPolygon(pgon);
    }
}
function circle2Polygon(myCircle, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonCircle";
    pgon.setAttribute("myElem", "myCircle");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    var myPoints = pgon.points;
    var r = +myCircle.getAttribute("r");
    var cx = +myCircle.getAttribute("cx");
    var cy = +myCircle.getAttribute("cy");
    var vCnt = 100;
    var polyXPts = Array(vCnt);
    var polyYPts = Array(vCnt);
    var vertexAngle = 360 / vCnt;
    //---init polygon points processor---
    for (var v = 0; v < vCnt; v++) {
        var theAngle = (v * vertexAngle) * Math.PI / 180;
        polyXPts[v] = r * Math.cos(theAngle);
        polyYPts[v] = -r * Math.sin(theAngle);
    }
    var mySVG = document.getElementById('mySVG');
    for (var v = 0; v < vCnt; v++) {
        var point = mySVG.createSVGPoint();
        point.x = cx + polyXPts[v];
        point.y = cy + polyYPts[v];
        myPoints.appendItem(point);
    }
    if (myCircle.getAttribute("transform")) {
        var trfm = myCircle.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}
//---
function line2Polygon(myLine, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonLine";
    pgon.setAttribute("myElem", "myLine");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    var x1 = +myLine.getAttribute("x1");
    var y1 = +myLine.getAttribute("y1");
    var x2 = +myLine.getAttribute("x2");
    var y2 = +myLine.getAttribute("y2");
    var pnts1 = [x1, y1, x2, y2];
    pgon.setAttribute("points", pnts1.join());
    if (myLine.getAttribute("transform")) {
        var trfm = myLine.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}
/*
     the polyline is separated into individual
     polygons for each leg
 */
var PolylinePgons = [];
var PolylineIntersectPolygon;
var PolylineShape; //---other shape compared to the polyline--
//---
function polyline2Pgons(myPolyline, locale) {
    var points = myPolyline.points;
    for (var k = 0; k < points.length; k++) {
        if (k < points.length - 1) {
            var xy1 = points[k];
            var xy2 = points[k + 1];
            var pnts = [xy1.x, xy1.y, xy2.x, xy2.y];
            //---create a polygon for each leg---
            var pgon = document.createElementNS(NS, "polygon");
            pgon.setAttribute("points", pnts.join());
            pgon.id = "pgonPolyline" + k;
            pgon.setAttribute("myElem", "myPolyline");
            pgon.setAttribute("stroke-width", "20");
            pgon.setAttribute("fill", "blue");
            pgonG.appendChild(pgon);
            if (myPolyline.getAttribute("transform")) {
                var trfm = myPolyline.getAttribute("transform");
                pgon.setAttribute("transform", trfm);
                ctmPolygon(pgon);
            }
            if (locale == "parent")
                PolygonDragParent.push(pgon);
            else
                PolygonDragChildren.push(pgon);
        }
    }
}
//---
function ellipse2Polygon(myEllipse, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonEllipse";
    pgon.setAttribute("myElem", "myEllipse");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    var myPoints = pgon.points;
    var rx = +myEllipse.getAttribute("rx");
    var ry = +myEllipse.getAttribute("ry");
    var cx = +myEllipse.getAttribute("cx");
    var cy = +myEllipse.getAttribute("cy");
    var vCnt = 20;
    var polyXPts = Array(vCnt);
    var polyYPts = Array(vCnt);
    var vertexAngle = 360 / vCnt;
    //---init polygon points processor---
    for (var v = 0; v < vCnt; v++) {
        var theAngle = (v * vertexAngle) * Math.PI / 180;
        polyXPts[v] = rx * Math.cos(theAngle);
        polyYPts[v] = -ry * Math.sin(theAngle);
    }
    var mySVG = document.getElementById('mySVG');
    for (var v = 0; v < vCnt; v++) {
        var point = mySVG.createSVGPoint();
        point.x = cx + polyXPts[v];
        point.y = cy + polyYPts[v];
        myPoints.appendItem(point);
    }
    if (myEllipse.getAttribute("transform")) {
        var trfm = myEllipse.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}
// drop하는 순간 호출됨
function text2Polygon(myText, locale) {
    var pgon = document.createElementNS(NS, "polygon");
    pgon.id = "pgonText";
    pgon.setAttribute("myElem", "myText");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    //---create a polygon around text---
    var bb1 = myText.getBBox();
    var bb1x = bb1.x;
    var bb1y = bb1.y;
    var bb1w = bb1.width;
    var bb1h = bb1.height;
    var pnts1 = [bb1x, bb1y, bb1x, bb1y + bb1h, bb1x + bb1w, bb1y + bb1h, bb1x + bb1w, bb1y];
    pgon.setAttribute("points", pnts1.join());
    if (myText.getAttribute("transform")) {
        pgon.setAttribute("transform", myText.getAttribute("transform"));
        ctmPolygon(pgon);
    }
}
