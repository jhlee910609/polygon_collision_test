let NS = "http://www.w3.org/2000/svg";
let TransformRequestObj: SVGTransform;
let TransList: SVGTransformList;

// drag 대상 요소
let DragTarget: SVGGraphicsElement = null;
let Dragging: boolean = false;
let DragStartGrabX: number = 0;
let DragStartGrabY: number = 0;
let DragChildrenPoints = [];


// <g> tag 바인딩
const pgonG = document.getElementById('pgonG');

// HTML 태그에 직접 바인딩 되어 있음
// 요소 드래그 시, 동작
function startDrag(evt) {
    //---prevents dragging conflicts on other draggable elements---
    if (!Dragging) {
        if (evt.target.getAttribute("class") == "dragTarget") {
            DragTarget = evt.target;
            //---clear previous---
            for (let k = pgonG.childNodes.length - 1; k >= 0; k--) {
                pgonG.removeChild(pgonG.childNodes.item(k));
            }
            DragTarget.setAttribute("opacity", 1 + '');
            setTimeout(() => getDragParentChildren(DragTarget), 500);

            //---reference point to its respective viewport--
            const pnt = DragTarget.ownerSVGElement.createSVGPoint();
            pnt.x = evt.clientX;
            pnt.y = evt.clientY;
            //---elements transformed and/or in different(svg) viewports---
            const sCTM = DragTarget.getScreenCTM();
            const Pnt = pnt.matrixTransform(sCTM.inverse());

            TransformRequestObj = DragTarget.ownerSVGElement.createSVGTransform();
            //---attach new or existing transform to element, init its transform list---
            const myTransListAnim = DragTarget.transform;
            TransList = myTransListAnim.baseVal;


            //---the point on the element to grab as its dragging point---
            DragStartGrabX = Pnt.x;
            DragStartGrabY = Pnt.y;
            Dragging = true;
        }
    }
}

// 드래그 시, 동작
// 충돌 검사 이쪽에 있음
function drag(evt) {
    if (Dragging) {
        const pnt = DragTarget.ownerSVGElement.createSVGPoint();
        pnt.x = evt.clientX;
        pnt.y = evt.clientY;
        //---elements in different(svg) viewports, and/or transformed ---
        const sCTM = DragTarget.getScreenCTM();
        const Pnt = pnt.matrixTransform(sCTM.inverse());
        Pnt.x -= DragStartGrabX;
        Pnt.y -= DragStartGrabY;

        TransformRequestObj.setTranslate(Pnt.x, Pnt.y);
        TransList.appendItem(TransformRequestObj);
        TransList.consolidate();

        // 충돌 검사 시작.
        getCollisions(DragTarget, Pnt.x, Pnt.y)
    }
}

//--mouse up---
function endDrag() {
    Dragging = false;
}

function getDragParentChildren(DragTarget: any) {
    //----set Parent/Children Polygons---
    PolygonDragParent = [];
    PolygonDragChildren = [];

    // 모든 요소 바인딩
    const myRect: SVGPolygonElement = <any>document.getElementById('myRect');
    const myEllipse: SVGPolygonElement = <any>document.getElementById('myEllipse');
    const myCircle: SVGPolygonElement = <any>document.getElementById('myCircle');
    const myPolygon: SVGPolygonElement = <any>document.getElementById('myPolygon');
    const myPath: SVGPolygonElement = <any>document.getElementById('myPath');
    const myText: SVGPolygonElement = <any>document.getElementById('myText');
    const myPolyline: SVGPolygonElement = <any>document.getElementById('myPolyline');

    // DragTarget = parent
    // !DragTarget = child
    if (DragTarget.nodeName == "circle") {
        circle2Polygon(myCircle, "parent");
    } else if (DragTarget.nodeName == "rect") {
        rect2Polygon(myRect, "parent");
    } else if (DragTarget.nodeName == "ellipse") {
        ellipse2Polygon(myEllipse, "parent");
    } else if (DragTarget.nodeName == "path") {
        path2Polygon(myPath, "parent");
    } else if (DragTarget.nodeName == "polygon") {
        polygon2Polygon(myPolygon, "parent");

    } else if (DragTarget.nodeName == "text") {
        text2Polygon(myText, "parent");
    } else if (DragTarget.nodeName == "polyline") {
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
    for (let m = 0; m < PolygonDragChildren.length; m++) {
        let pgonChild = PolygonDragChildren[m];
        let shapeChild = pgonChild.id;
        let myElem = document.getElementById(pgonChild.getAttribute("myElem"));
        let bPoints = pgonChild.points;
        let n = bPoints.numberOfItems;
        let minusB: number;

        //---ignore 'close' leg of polygon---
        if (shapeChild.indexOf("pgonPolyline") != -1 || shapeChild == "pgonLine" || shapeChild == "pgonPathOpen" || shapeChild == "pgonPathOpenSmooth")
            minusB = -1;
        else
            minusB = 0;

        //--each side of polygon---
        for (let k = 0; k < n + minusB; k++) {
            let bX1 = bPoints.getItem(k).x;
            let bY1 = bPoints.getItem(k).y;
            let bX2: number;
            let bY2: number;

            if (k < n - 1) {
                bX2 = bPoints.getItem(k + 1).x;
                bY2 = bPoints.getItem(k + 1).y;
            } else {
                bX2 = bPoints.getItem(0).x;
                bY2 = bPoints.getItem(0).y;
            }
            DragChildrenPoints.push([myElem, [bX1, bY1, bX2, bY2]])
        }
    }
}


// 그래그 중의 충돌 검사
function getCollisions(DragTarget, transX, transY) {
    let collide = false;
    // 충돌한 요소 저장
    const collidedElems = [];
    for (let k = 0; k < PolygonDragParent.length; k++) {
        const pgonParent = PolygonDragParent[k];
        const shapeParent = pgonParent.id;
        if (DragTarget.nodeName == "polygon")
            setTargetPnts(pgonParent, DragTarget);
        else {
            pgonParent.setAttribute("transform", "translate(" + transX + " " + transY + ")");
            ctmPolygon(pgonParent);
        }

        const aPoints = pgonParent.points;
        const m = aPoints.numberOfItems;
        let minusA: number;

        //---ignore 'close' leg of polygon---
        if (shapeParent.indexOf("pgonPolyline") != -1 || shapeParent == "pgonLine" || shapeParent == "pgonPathOpen" || shapeParent == "pgonPathOpenSmooth")
            minusA = -1;
        else
            minusA = 0;

        for (let i = 0; i < m + minusA; i++) {
            let aX1 = aPoints.getItem(i).x;
            let aY1 = aPoints.getItem(i).y;
            let aY2: number;
            let aX2: number;

            if (i < m - 1) {
                aX2 = aPoints.getItem(i + 1).x;
                aY2 = aPoints.getItem(i + 1).y;
            } else {
                aX2 = aPoints.getItem(0).x;
                aY2 = aPoints.getItem(0).y;
            }

            for (let p = 0; p < DragChildrenPoints.length; p++) {
                let child = DragChildrenPoints[p][0];
                let id = child.id;
                let childPnts = DragChildrenPoints[p][1];
                if (lineSegIntersect(aX1, aY1, aX2, aY2, childPnts[0], childPnts[1], childPnts[2], childPnts[3])) {
                    collide = true;
                    child.setAttribute("opacity", .4);
                    if (collidedElems.toString().indexOf(id) == -1)
                        collidedElems.push(id)
                } else if (child.getAttribute("opacity") === '.4') {
                    for (let ce = 0; ce < collidedElems.length; ce++) {
                        const ceId = collidedElems[ce];
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
    for (let ce = 0; ce < collidedElems.length; ce++)
        document.getElementById(collidedElems[ce]).setAttribute("opacity", .4 + '');

    if (collide == false) {
        const dragElems = document.getElementsByClassName("dragTarget");
        for (let k = 0; k < dragElems.length; k++) {
            dragElems[k].setAttribute("opacity", 1 + '');
        }
    }
}

//---remove transform, create screen points for polygon---
function ctmPolygon(myPoly) {
    const ctm = myPoly.getCTM();
    const svgRoot = myPoly.ownerSVGElement;
    const pointsList: SVGPointList = myPoly.points;
    const n: number = pointsList.numberOfItems;

    if (svgRoot) {
        for (let m: number = 0; m < n; m++) {
            const mySVGPoint: DOMPoint = svgRoot.createSVGPoint();
            mySVGPoint.x = pointsList.getItem(m).x;
            mySVGPoint.y = pointsList.getItem(m).y;
            const mySVGPointTrans = mySVGPoint.matrixTransform(ctm);
            pointsList.getItem(m).x = mySVGPointTrans.x;
            pointsList.getItem(m).y = mySVGPointTrans.y;
        }
    }
    myPoly.removeAttribute("transform");
}

function setTargetPnts(pgonParent, DragTarget) {
    const ctm = DragTarget.getCTM();
    const svgRoot = DragTarget.ownerSVGElement;
    const pointsList = DragTarget.points;
    const pointsListParent = pgonParent.points;
    const n = pointsList.numberOfItems;

    for (let m = 0; m < n; m++) {
        const mySVGPoint = svgRoot.createSVGPoint();
        mySVGPoint.x = pointsList.getItem(m).x;
        mySVGPoint.y = pointsList.getItem(m).y;

        const mySVGPointTrans = mySVGPoint.matrixTransform(ctm);
        pointsListParent.getItem(m).x = mySVGPointTrans.x;
        pointsListParent.getItem(m).y = mySVGPointTrans.y;
    }
}

//---compare two lines: A.B---
function lineSegIntersect(aX1: number, aY1: number, aX2: number, aY2: number, bX1: number, bY1: number, bX2: number, bY2: number) {
    //---compute vectors Va, Vb--------
    const Va = ((bX2 - bX1) * (aY1 - bY1) - (bY2 - bY1) * (aX1 - bX1)) / ((bY2 - bY1) * (aX2 - aX1) - (bX2 - bX1) * (aY2 - aY1));
    const Vb = ((aX2 - aX1) * (aY1 - bY1) - (aY2 - aY1) * (aX1 - bX1)) / ((bY2 - bY1) * (aX2 - aX1) - (bX2 - bX1) * (aY2 - aY1));

    if (Va > 0 && Va < 1 && Vb > 0 && Vb < 1)
        return true;
    else
        return false;
}


let PolygonDragParent: SVGPolygonElement[] = [];
let PolygonDragChildren: SVGPolygonElement[] = [];

//=============Elements to Polygons===================
function polygon2Polygon(myPolygon, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonPolygon";
    pgon.setAttribute("myElem", "myPolygon");
    pgonG.appendChild(pgon);
    if (locale == "parent") {
        PolygonDragParent.push(pgon);
    } else
        PolygonDragChildren.push(pgon);
    pgon.setAttribute("points", myPolygon.getAttribute("points"));

    if (myPolygon.getAttribute("transform")) {
        const trfm = myPolygon.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}

function path2Polygon(myPath, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.setAttribute("myElem", "myPath");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);

    let pntStng = myPath.getAttribute("d");
    let id = '';
    if (pntStng.indexOf("z") != -1 || pntStng.indexOf("Z") != -1)
        id = "pgonPath";
    else
        id = "pgonPathOpen";

    //---is this a linear or smooth path?---
    let pathStng = myPath.getAttribute("d").toLowerCase();
    if (  //---smooth path--
        pathStng.indexOf("c") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("t") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("s") != -1
        || pathStng.indexOf("a") != -1
    )
        id += "Smooth";
    pgon.id = id;

    //---is path closed?---
    let d = myPath.getAttribute("d");
    let Z = "";
    if (d.indexOf("z") != -1)
        Z = "z";
    if (d.indexOf("Z") != -1)
        Z = "Z";

    let endLength = 0;
    if (Z == "z" || Z == "Z") {
        d = d.replace(Z, "");
        let tempPath: SVGPathElement = <any>document.createElementNS(NS, 'path');
        tempPath.setAttribute("d", d);
        endLength = tempPath.getTotalLength();
    } else
        endLength = myPath.getTotalLength();

    pathStng = myPath.getAttribute("d").toLowerCase();
    //---smooth path--
    let pathSmooth: boolean;
    if (
        pathStng.indexOf("c") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("t") != -1
        || pathStng.indexOf("q") != -1
        || pathStng.indexOf("s") != -1
        || pathStng.indexOf("a") != -1
    )
        pathSmooth = true;
    else
        pathSmooth = false;

    if (pathSmooth) {
        const segCnt = 150;
        let pntList = pgon.points;
        const lengthDelta = endLength / segCnt;

        for (let k = 0; k < segCnt; k++) {
            const len = lengthDelta * k;
            if (len < endLength) {
                const pnt = myPath.getPointAtLength(len);
                pntList.appendItem(pnt)
            } else
                break;
        }
        //---straight path: create a polygon---
    } else {
        const len = myPath.getTotalLength();
        let p = myPath.getPointAtLength(0);
        let seg = myPath.getPathSegAtLength(0);
        let pnts = p.x + "," + p.y;

        for (let i = 1; i < len; i++) {
            p = myPath.getPointAtLength(i);
            if (myPath.getPathSegAtLength(i) > seg) {
                pnts = pnts + " " + p.x + "," + p.y;
                seg = myPath.getPathSegAtLength(i);
            }
        }
        pgon.setAttribute("points", pnts)
    }

    if (myPath.getAttribute("transform")) {
        pgon.setAttribute("transform", myPath.getAttribute("transform"))
        ctmPolygon(pgon)
    }

}

function rect2Polygon(myRect, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonRect";
    pgon.setAttribute("myElem", "myRect");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);

    const x = +myRect.getAttribute("x");
    const y = +myRect.getAttribute("y");
    const w = +myRect.getAttribute("width");
    const h = +myRect.getAttribute("height");
    const pnts1 = [x, y, x, y + h, x + w, y + h, x + w, y];
    pgon.setAttribute("points", pnts1.join());

    if (myRect.getAttribute("transform")) {
        pgon.setAttribute("transform", myRect.getAttribute("transform"));
        ctmPolygon(pgon)
    }
}

function circle2Polygon(myCircle, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonCircle";
    pgon.setAttribute("myElem", "myCircle");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);

    let myPoints = pgon.points;
    let r = +myCircle.getAttribute("r");
    let cx = +myCircle.getAttribute("cx");
    let cy = +myCircle.getAttribute("cy");

    const vCnt = 100;
    const polyXPts = Array(vCnt);
    const polyYPts = Array(vCnt);
    const vertexAngle = 360 / vCnt;
    //---init polygon points processor---
    for (let v = 0; v < vCnt; v++) {
        const theAngle = (v * vertexAngle) * Math.PI / 180;
        polyXPts[v] = r * Math.cos(theAngle);
        polyYPts[v] = -r * Math.sin(theAngle);
    }


    const mySVG: SVGSVGElement = <any>document.getElementById('mySVG');
    for (let v = 0; v < vCnt; v++) {
        const point: SVGPoint = <any>mySVG.createSVGPoint();
        point.x = cx + polyXPts[v];
        point.y = cy + polyYPts[v];
        myPoints.appendItem(point);
    }

    if (myCircle.getAttribute("transform")) {
        const trfm = myCircle.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon)
    }
}

//---
function line2Polygon(myLine, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonLine";
    pgon.setAttribute("myElem", "myLine");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);

    const x1 = +myLine.getAttribute("x1");
    const y1 = +myLine.getAttribute("y1");
    const x2 = +myLine.getAttribute("x2");
    const y2 = +myLine.getAttribute("y2");

    const pnts1 = [x1, y1, x2, y2];
    pgon.setAttribute("points", pnts1.join());

    if (myLine.getAttribute("transform")) {
        const trfm = myLine.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon);
    }
}

/*
     the polyline is separated into individual
     polygons for each leg
 */
const PolylinePgons = [];
let PolylineIntersectPolygon;
let PolylineShape; //---other shape compared to the polyline--
//---
function polyline2Pgons(myPolyline, locale) {
    const points = myPolyline.points;
    for (let k = 0; k < points.length; k++) {
        if (k < points.length - 1) {
            const xy1 = points[k];
            const xy2 = points[k + 1];
            const pnts = [xy1.x, xy1.y, xy2.x, xy2.y];
            //---create a polygon for each leg---
            const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
            pgon.setAttribute("points", pnts.join());
            pgon.id = "pgonPolyline" + k;
            pgon.setAttribute("myElem", "myPolyline");
            pgon.setAttribute("stroke-width", "20");
            pgon.setAttribute("fill", "blue");
            pgonG.appendChild(pgon);
            if (myPolyline.getAttribute("transform")) {
                const trfm = myPolyline.getAttribute("transform");
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
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonEllipse";
    pgon.setAttribute("myElem", "myEllipse");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);

    const myPoints = pgon.points;
    const rx = +myEllipse.getAttribute("rx");
    const ry = +myEllipse.getAttribute("ry");
    const cx = +myEllipse.getAttribute("cx");
    const cy = +myEllipse.getAttribute("cy");

    const vCnt = 20;
    const polyXPts = Array(vCnt);
    const polyYPts = Array(vCnt);
    const vertexAngle = 360 / vCnt;
    //---init polygon points processor---
    for (let v = 0; v < vCnt; v++) {
        const theAngle = (v * vertexAngle) * Math.PI / 180;
        polyXPts[v] = rx * Math.cos(theAngle);
        polyYPts[v] = -ry * Math.sin(theAngle);
    }

    const mySVG: SVGSVGElement = <any>document.getElementById('mySVG');
    for (let v = 0; v < vCnt; v++) {
        const point = mySVG.createSVGPoint();
        point.x = cx + polyXPts[v];
        point.y = cy + polyYPts[v];
        myPoints.appendItem(point)
    }

    if (myEllipse.getAttribute("transform")) {
        const trfm = myEllipse.getAttribute("transform");
        pgon.setAttribute("transform", trfm);
        ctmPolygon(pgon)
    }

}

// drop하는 순간 호출됨
function text2Polygon(myText, locale) {
    const pgon: SVGPolygonElement = <any>document.createElementNS(NS, "polygon");
    pgon.id = "pgonText";
    pgon.setAttribute("myElem", "myText");
    pgonG.appendChild(pgon);
    if (locale == "parent")
        PolygonDragParent.push(pgon);
    else
        PolygonDragChildren.push(pgon);
    //---create a polygon around text---
    const bb1 = myText.getBBox();
    const bb1x = bb1.x;
    const bb1y = bb1.y;
    const bb1w = bb1.width;
    const bb1h = bb1.height;
    const pnts1 = [bb1x, bb1y, bb1x, bb1y + bb1h, bb1x + bb1w, bb1y + bb1h, bb1x + bb1w, bb1y];
    pgon.setAttribute("points", pnts1.join());

    if (myText.getAttribute("transform")) {
        pgon.setAttribute("transform", myText.getAttribute("transform"));
        ctmPolygon(pgon)
    }

}