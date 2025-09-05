//
// funhouse.js
//
// Author: Jim Fix
// CSCI 385: Computer Graphics, Reed College, Fall 2024
//
// This defines the supporting objects for the ray traced scene
// editor.
//
// It defines these two classes
//
//  * Sphere: the placement and sizing of a sphere in the scene.
//
//  * Curve: a (Bezier) curve as specified by some control points.
//
// Both can be rendered in a WebGL/opengl context.
//
// ------
//


const MINIMUM_PLACEMENT_SCALE = 0.15;// Smallest sphere we can place.
const MAX_SELECT_DISTANCE = 0.2;     // Distance to select a control point.
const SMOOTHNESS = 1000.0;           // How smooth is our curve approx?
const EPSILON = 0.000000001;


class Sphere {
    //
    // Class representing the placement a sphere in the scene.
    //
    constructor(color, position0) {
        //
        // `position`, `radius`: a `point` and number,
        //  representing the location and size of a
        //  sphere placed in the scene.
        //
        this.color       = color;
        this.position    = position0;
        this.radius      = MINIMUM_PLACEMENT_SCALE;
        // Give all spheres the same velocity scale
        const speed = 0.2;
        const angle = Math.random() * 2 * Math.PI;
        this.velocity = new Vector3d(
            speed * Math.cos(angle),
            speed * Math.sin(angle),
            0
        );
        this.lastUpdate = performance.now();
    }
    
    resize(scale, bounds) {
        //
        // Resize the sphere.  Some checks prevent growing it beyond
        // the scene bounds.
        //
        scale = Math.max(scale, MINIMUM_PLACEMENT_SCALE);
        scale = Math.min(scale, bounds.right - this.position.x);
        scale = Math.min(scale, bounds.top - this.position.y);
        scale = Math.min(scale, this.position.x - bounds.left);
        scale = Math.min(scale, this.position.y - bounds.bottom) ;
        this.radius = scale;    
    }

    moveTo(position, bounds) {
        //
        // Relocate the sphere.  Some checks prevent the object from
        // being placed outside the scene bounds.
        //
        position.x = Math.max(position.x ,bounds.left + this.radius);
        position.y = Math.max(position.y, bounds.bottom + this.radius);
        position.x = Math.min(position.x, bounds.right - this.radius);
        position.y = Math.min(position.y, bounds.top - this.radius);
        this.position = position;
    }

    includes(queryPoint) {
        //
        // Checks whether the `queryPoint` lives within its footprint.
        //
        const distance = this.position.dist2(queryPoint);
        return (distance < this.radius*this.radius);
    }

    draw(highlightColor, drawBase, drawShaded) {
        //
        // Draws the sphere within the current WebGL/opengl context.
        //
        glPushMatrix();
        glTranslatef(this.position.x, this.position.y, this.position.z);
        glScalef(this.radius, this.radius, this.radius);
        //
        // draw
        if (drawShaded) {
            // Turn on lighting.
            glEnable(GL_LIGHTING);
            glEnable(GL_LIGHT0);
        }
        glColor3f(this.color.r, this.color.g, this.color.b);
        glBeginEnd("sphere");
        if (drawShaded) {
            // Turn on lighting.
            glDisable(GL_LIGHT0);
            glDisable(GL_LIGHTING);
        }

        // draw with highlights
        if (highlightColor != null) {
            
            glColor3f(highlightColor.r,
                      highlightColor.g,
                      highlightColor.b);
            //
            // Draw its wireframe.
            glBeginEnd("sphere-wireframe");
        }

        glPopMatrix();
    }    

    updatePhysics(bounds, spheres) {
        const now = performance.now();
        // dt is proportioal to the time since the last update in seconds.
        // This keeps the object speed regardless of frame rate, e.g. when
        // the mirror is displayed and the framerate drops.
        const dt = (now - this.lastUpdate) / 100;
        this.lastUpdate = now;

        // Update position
        this.position.x += this.velocity.dx * dt;
        this.position.y += this.velocity.dy * dt;

        // Handle wall collisions
        if (this.position.x - this.radius < bounds.left) {
            this.position.x = bounds.left + this.radius;
            this.velocity.dx *= -0.95;
        }
        if (this.position.x + this.radius > bounds.right) {
            this.position.x = bounds.right - this.radius;
            this.velocity.dx *= -0.95;
        }
        if (this.position.y - this.radius < bounds.bottom) {
            this.position.y = bounds.bottom + this.radius;
            this.velocity.dy *= -0.95;
        }
        if (this.position.y + this.radius > bounds.top) {
            this.position.y = bounds.top - this.radius;
            this.velocity.dy *= -0.95;
        }

        for (let sphere of spheres) {
            if (sphere !== this) {
                this.handleSphereCollision(sphere);
            }
        }
    }

    handleSphereCollision(other) {
        const dx = this.position.x - other.position.x;
        const dy = this.position.y - other.position.y;
        const dz = this.radius - other.radius;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const minDist = this.radius + other.radius;

        if (distance < minDist) {
            // Normalize the collision normal
            const nx = dx / distance;
            const ny = dy / distance;

            // Calculate relative velocity
            const rvx = this.velocity.dx - other.velocity.dx;
            const rvy = this.velocity.dy - other.velocity.dy;

            // Calculate velocity along collision normal
            const velAlongNormal = rvx * nx + rvy * ny;

            // Only resolve if objects are moving toward each other
            if (velAlongNormal < 0) {
                const damping = 0.95;
                
                // Calculate masses (proportional to radius cubed)
                const m1 = this.radius * this.radius * this.radius;
                const m2 = other.radius * other.radius * other.radius;
                const totalMass = m1 + m2;

                // Calculate impulse scalar
                const j = -(1 + damping) * velAlongNormal / (1/m1 + 1/m2);

                // Apply impulses in the direction of the collision normal
                this.velocity.dx += (j / m1) * nx;
                this.velocity.dy += (j / m1) * ny;
                other.velocity.dx -= (j / m2) * nx;
                other.velocity.dy -= (j / m2) * ny;

                // Separate spheres
                const correction = (minDist - distance) / totalMass;
                this.position.x += nx * correction * m2;
                this.position.y += ny * correction * m2;
                other.position.x -= nx * correction * m1;
                other.position.y -= ny * correction * m1;
            }
        }
    }
}


class Curve {
    //
    // Class representing a controllable Bezier quadratic curve in a
    // scene.
    //
    // The control points array passed to the constructor can be
    // edited externally by a client. The client is required to call
    // the `update` method when any control point has been
    // edited. This will trigger a "recompiling" of the points of the
    // polyline used to render the Bezier curve. 
    //
    constructor(controlPoints) {
        this.controlPoints = controlPoints;
        //
        this.points        = [];    // The samples for the approximation of the curve.
        this.compiled      = false; // Has `this.points` been computed?
    }

    bezier(t) {
        const x = (1 - t) * (1 - t) * this.controlPoints[0].x +
                  2 * (1 - t) * t * this.controlPoints[1].x +
                  t * t * this.controlPoints[2].x;
        const y = (1 - t) * (1 - t) * this.controlPoints[0].y +
                  2 * (1 - t) * t * this.controlPoints[1].y +
                  t * t * this.controlPoints[2].y;
        return new Point3d(x, y, 0.0);
    }

    subdivide(t0, t1, p0, p1) {
        const tm = (t0 + t1) / 2;
        const pm = this.bezier(tm);

        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        let length = Math.sqrt(dx * dx + dy * dy);

        if (length < EPSILON) length = EPSILON;

        const area = Math.abs((p1.x - p0.x) * (pm.y - p0.y) - (p1.y - p0.y) * (pm.x - p0.x));
        const distance = area / length;

        const threshold = 1/SMOOTHNESS;

        if (distance > threshold) {
            this.subdivide(t0, tm, p0, pm);
            this.subdivide(tm, t1, pm, p1);
        } else {
            this.points.push(p1);
        }
    }

    compile() {
        if (!this.compiled) {
            this.points = [];

            const t0 = 0;
            const t1 = 1;
            const p0 = this.bezier(t0);
            const p1 = this.bezier(t1);

            this.points.push(p0);
            this.subdivide(t0, t1, p0, p1);

            this.compiled = true;
        }
    }

    update() {
        //
        // Invalidate `this.points` so that it gets recompiled
        // when the curve points need to be used (to draw, e.g.).
        //
        this.compiled = false;
    }

    chooseControlPoint(queryPoint) {
        //
        // Returns the integer index (0, 1, or 2) of the closest
        // control point to the given `queryPoint`, or -1 if none
        // are close enough.
        //
        let which = -1;
        let distance2 = MAX_SELECT_DISTANCE * MAX_SELECT_DISTANCE;
        for (let i=0; i <= 2; i++) {
            const d2 = queryPoint.minus(this.controlPoints[i]).norm2();
            if (d2 < distance2) {
                which = i;
                distance2 = d2;
            }
        }
        return which;
    }
    
    drawControls() {
        //
        // Renders the three control points of a quadratic
        // Bezier curve.
        //
        for (let i=0; i <= 2; i++) {
            glPushMatrix();
            glTranslatef(this.controlPoints[i].x,
                         this.controlPoints[i].y,
                         1.9);
            glScalef(0.02,0.02,0.02);
            const gc = gPOINT_COLOR;
            glColor3f(gc.r, gc.g, gc.b);
            glBeginEnd("square");
            glPopMatrix();
        }
    }

    drawCurve() {
        //
        // Renders the polyline specified as the array of points
        // `this.points`. These should give a smooth approximation
        // of the quadratic Bezier, and so as a result this code
        // draws the curve.
        //
        const cc = gCURVE_COLOR;
        for (let index = 1; index < this.points.length; index++) {
            //
            // Compute some info about this segment of the polyline.
            const p0 = this.points[index-1];
            const p1 = this.points[index];
            const dir = p1.minus(p0).unit();
            const len = p0.dist(p1);
            const ang = Math.atan2(dir.dy, dir.dx) * 180.0 / Math.PI;
            
            glPushMatrix();
            //
            // Perform the transformations to render this segment.
            glTranslatef(p0.x, p0.y, 1.5);
            glRotatef(ang, 0.0, 0.0, 1.0);
            glRotatef(90,0.0,1.0,0.0);
            glScalef(0.01, 0.01, len);
            //
            // Render this segment of the curve.
            glColor3f(cc.r, cc.g, cc.b);
            glBeginEnd("path")
            //
            glPopMatrix();
        }
    }        
    
    draw() {
        // Renders the curve control points and the actual
        // curve.
        //
        // If the control points have moved since the last
        // time the curve was drawn, then this recompiles
        // the curve from the control point info.
        //
        this.compile();      // Recomputes this.points.
        this.drawCurve();    // Uses this.points.
        //
        this.drawControls();
    }   
}
