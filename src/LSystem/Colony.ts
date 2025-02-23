import { vec3, vec4, quat } from "gl-matrix";
import PropertyHolder from "./PropertyHolder";
import Unit from "./Unit";

var kdTree = require('k-d-tree');

class Colony {

  geometry: { [key:string]:PropertyHolder; };
  center: vec3;
  up: vec3;
  radius: number;
  seed: any;

  constructor(geometry: { [key:string]:PropertyHolder; }, seed: any, center: vec3, up: vec3, radius: number) {
    this.geometry = geometry;
    this.center = center;
    this.up = up;
    this.radius = radius;
    this.seed = seed;

    this.generate();
  }

  generate() {
    let colonyRotation: quat = quat.create();
    let degrees = this.seed() * 360;
    quat.rotateY(colonyRotation, colonyRotation, degrees * Math.PI / 180);

    let domeScale: number = 3.3;

    let craterColor: vec4 = vec4.fromValues(209, 80, 41, 255);
    vec4.scale(craterColor, craterColor, 1/255.0);

    let domeColor: vec4 = vec4.fromValues(125, 125, 125, 125);
    vec4.scale(domeColor, domeColor, 1/255.0);

    this.geometry['crater'].add(vec4.fromValues(this.center[0], this.center[1], this.center[2], 1), vec4.fromValues(colonyRotation[0],colonyRotation[1],colonyRotation[2],colonyRotation[3]), vec4.fromValues(this.radius,this.radius,this.radius,this.radius), craterColor, vec4.fromValues(0,0,0,0));
    this.geometry['dome'].add(vec4.fromValues(this.center[0], this.center[1], this.center[2], 1), vec4.fromValues(colonyRotation[0],colonyRotation[1],colonyRotation[2],colonyRotation[3]), vec4.fromValues(this.radius*domeScale,this.radius*domeScale,this.radius*domeScale,this.radius), domeColor, vec4.fromValues(0,0,0,0));


    let r = this.radius * 0.8;
    var distance = function(a: any, b: any){
      return Math.sqrt(Math.pow(a.coordinates[0] - b.coordinates[0], 2) +  Math.pow(a.coordinates[1] - b.coordinates[1], 2) + Math.pow(a.coordinates[2] - b.coordinates[2], 2)) - a.radius;
    }

    let nearestTrees = new kdTree([], distance);

    let unit: Unit = new Unit(this.geometry, this.seed, this.center, this.up, r);

    let queue = [{center: this.center, radius: r / 2, distance: r * 2, level: 0}];
    
    let units: any = [];

    while(queue.length > 0) {
      let curData = queue.pop();

      let maxLevel: number = 4;
      if(curData.level < maxLevel) {
        let nextColonyAim = vec3.fromValues(1,0,0);
        vec3.scale(nextColonyAim, nextColonyAim, curData.distance);
        vec3.add(nextColonyAim, nextColonyAim, curData.center);

        for(let i: number = 0; i < 15; ++i) {
          let nextColonyPosition: vec3 = vec3.create();

          let degrees = this.seed() * 360;
          vec3.rotateY(nextColonyPosition, nextColonyAim, curData.center, degrees * Math.PI / 180);

          var colonyCoord = {
            coordinates: nextColonyPosition,
            radius: curData.radius
          };

          let keepGoing: boolean = true;
          for(let j: number = 0; j < units.length; ++j) {
            let element = units[j];
            if(vec3.distance(element.coordinates, colonyCoord.coordinates) < 1.0 * (element.radius + colonyCoord.radius)) {
              keepGoing = false;
            }
          }

          if(!keepGoing || vec3.distance(this.center, colonyCoord.coordinates) < 1.0 * (r + colonyCoord.radius) ||
              vec3.distance(this.center, colonyCoord.coordinates) + colonyCoord.radius > 4.0 * r) {
            continue;
          }

          units.push(colonyCoord);
          let unit: Unit = new Unit(this.geometry, this.seed, nextColonyPosition, this.up, curData.radius);

          // Add a road
          let q: quat = quat.create();
          quat.rotateY(q, q, degrees * Math.PI / 180);
          quat.normalize(q, q);
          let translation: vec3 = vec3.create();
          vec3.add(translation, curData.center, nextColonyPosition);
          vec3.scale(translation, translation, 0.5);

          let r2: vec3 = vec3.fromValues(255,255,255);
          let r1: vec3 = vec3.fromValues(0,0,0);

          let u = 1.0 - (1/curData.radius);

          let roadColor: vec3 = vec3.create();

          let lhs: vec3 = vec3.create();
          vec3.scale(lhs, r1, 1-u);

          let rhs: vec3 = vec3.create();
          vec3.scale(rhs, r2, u);

          vec3.add(roadColor, lhs, rhs);

          vec3.scale(roadColor, roadColor, 1/255.0);
          //vec4.scale(roadColor, roadColor, )
          this.geometry['road'].add(vec4.fromValues(translation[0], translation[1], translation[2], 1),
                                    vec4.fromValues(q[0], q[1], q[2], q[3]), 
                                    vec4.fromValues(vec3.distance(nextColonyPosition, curData.center) * 0.15,0.4 * curData.radius,0.1 * vec3.distance(nextColonyPosition, curData.center),1),
                                    vec4.fromValues(roadColor[0], roadColor[1], roadColor[2], 1),
                                    vec4.fromValues(0,0,0,0));

          nearestTrees.insert({
            coordinates: [translation[0], translation[1], translation[2]],
            radius: curData.radius
          });

          queue.push({center: vec3.fromValues(nextColonyPosition[0], nextColonyPosition[1], nextColonyPosition[2]),
                      radius: curData.radius * 0.7,
                      distance: curData.distance * 0.6,
                      level: curData.level + 1});
        }
      }
    }
  }
}

export default Colony;