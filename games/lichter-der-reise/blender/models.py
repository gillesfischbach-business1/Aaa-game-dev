"""Blender model builder for "Lichter der Reise".

Run headless:  python models.py  (with the `bpy` package, Blender 5.x as a Python module)
Builds the white van "Fidèle" (Citroën C15 style), the green hypercar "Smaragd" (Valhalla style)
and the characters Léo and Mira, then writes ../assets/models.bin for the game.

Coordinates: Blender X = game x, Blender Y = -game z (the car's front points to +Y), Blender Z = game y.
Every object carries a material name; the exporter groups triangles by (model, material).
"""
import bpy, bmesh, math, struct, json, os, sys
from mathutils import Vector, Matrix

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'models.bin')
RENDER = len(sys.argv) > 1 and sys.argv[1] == '--render'

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color=(0.8, 0.8, 0.8), metal=0.0, rough=0.5, emit=0.0, alpha=1.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get('Principled BSDF')
    b.inputs['Base Color'].default_value = (*color, 1)
    b.inputs['Metallic'].default_value = metal
    b.inputs['Roughness'].default_value = rough
    if emit:
        b.inputs['Emission Color'].default_value = (*color, 1)
        b.inputs['Emission Strength'].default_value = emit
    if alpha < 1:
        b.inputs['Alpha'].default_value = alpha
    return m

def obj_from(name, verts, faces, material, model):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    o.data.materials.append(material)
    o['model'] = model
    return o

def loft(name, stations, ring, material, model, cx=0.0):
    """stations: list of (z_game, w, yb, yt, e, tw); returns closed mesh object."""
    verts, faces = [], []
    for (z, w, yb, yt, e, tw) in stations:
        cy = (yb + yt) / 2; hh = (yt - yb) / 2
        for j in range(ring):
            a = j / ring * 2 * math.pi
            c, s = math.cos(a), math.sin(a)
            x = math.copysign(abs(c) ** (2 / e), c) * w
            y = math.copysign(abs(s) ** (2 / e), s) * hh
            if y > 0: x *= 1 + (tw - 1) * (y / hh)
            verts.append((x + cx, -z, cy + y))
    n = len(stations)
    for i in range(n - 1):
        for j in range(ring):
            a = i * ring + j; b = i * ring + (j + 1) % ring
            faces.append((a, b, b + ring, a + ring))
    faces.append(tuple(range(ring))[::-1])
    faces.append(tuple((n - 1) * ring + j for j in range(ring)))
    o = obj_from(name, verts, faces, material, model)
    me = o.data
    for p in me.polygons: p.use_smooth = True
    return o

def box(name, size, loc, material, model, bevel=0.0, rot=(0, 0, 0), segs=3):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); o['model'] = model
    if bevel:
        m = o.modifiers.new('bv', 'BEVEL'); m.width = bevel; m.segments = segs; m.limit_method = 'ANGLE'
    for p in o.data.polygons: p.use_smooth = True
    return o

def cyl(name, r, depth, loc, material, model, rot=(0, 0, 0), verts=32, bevel=0.0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    o.data.materials.append(material); o['model'] = model
    if bevel:
        m = o.modifiers.new('bv', 'BEVEL'); m.width = bevel; m.segments = 2; m.limit_method = 'ANGLE'
    for p in o.data.polygons: p.use_smooth = True
    return o

def sphere(name, r, loc, material, model, scale=(1, 1, 1), seg=24, ring=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg, ring_count=ring, radius=r, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(material); o['model'] = model
    for p in o.data.polygons: p.use_smooth = True
    return o

def cutter(size, loc, rot=(0, 0, 0), kind='box', r=0.3, depth=1.0):
    if kind == 'box':
        bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
        o = bpy.context.active_object; o.scale = size
    else:
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=r, depth=depth, location=loc, rotation=rot)
        o = bpy.context.active_object
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.hide_render = True; o['cutter'] = True
    return o

def boolean(target, cutters, op='DIFFERENCE'):
    for c in cutters:
        m = target.modifiers.new('b', 'BOOLEAN'); m.object = c; m.operation = op; m.solver = 'EXACT'
    bpy.context.view_layer.objects.active = target
    for m in list(target.modifiers):
        if m.type == 'BOOLEAN': bpy.ops.object.modifier_apply(modifier=m.name)
    for c in cutters: bpy.data.objects.remove(c, do_unlink=True)

def finish(o, bevel=0.012, weighted=True):
    if bevel:
        m = o.modifiers.new('bv', 'BEVEL'); m.width = bevel; m.segments = 2; m.limit_method = 'ANGLE'; m.angle_limit = math.radians(35)
    if weighted:
        o.modifiers.new('wn', 'WEIGHTED_NORMAL')

def gy(z): return -z  # game z -> blender y

# ---------------------------------------------------------------- materials
def materials():
    return dict(
        white=mat('paint_white', (0.84, 0.84, 0.81), 0.0, 0.32),
        green=mat('paint_green', (0.012, 0.1, 0.055), 0.6, 0.22),
        plastic=mat('plastic', (0.035, 0.035, 0.04), 0.0, 0.75),
        trim=mat('trim', (0.13, 0.13, 0.14), 0.0, 0.6),
        chrome=mat('chrome', (0.78, 0.78, 0.8), 1.0, 0.18),
        steel=mat('steel', (0.45, 0.46, 0.48), 1.0, 0.35),
        glass=mat('glass', (0.02, 0.03, 0.03), 0.0, 0.05, alpha=0.6),
        head=mat('light_head', (1.0, 0.92, 0.75), 0.0, 0.2, emit=4),
        led=mat('light_led', (0.85, 0.92, 1.0), 0.0, 0.2, emit=6),
        tail=mat('light_tail', (1.0, 0.05, 0.03), 0.0, 0.2, emit=3),
        orange=mat('light_ind', (1.0, 0.45, 0.05), 0.0, 0.2, emit=1),
        seat=mat('seat', (0.06, 0.05, 0.05), 0.0, 0.85),
        dash=mat('dash', (0.05, 0.05, 0.055), 0.0, 0.7),
        carbon=mat('carbon', (0.03, 0.03, 0.035), 0.3, 0.35),
        gold=mat('gold', (0.72, 0.5, 0.2), 1.0, 0.25),
        skin=mat('skin', (0.78, 0.53, 0.4), 0.0, 0.55),
        skin2=mat('skin2', (0.85, 0.6, 0.47), 0.0, 0.55),
        hair_dark=mat('hair_dark', (0.05, 0.035, 0.025), 0.0, 0.85),
        hair_brown=mat('hair_brown', (0.22, 0.12, 0.06), 0.0, 0.8),
        denim=mat('denim', (0.08, 0.09, 0.12), 0.0, 0.85),
        jogger=mat('jogger', (0.5, 0.5, 0.52), 0.0, 0.95),
        knit=mat('knit', (0.28, 0.18, 0.11), 0.0, 0.98),
        jeans=mat('jeans', (0.12, 0.16, 0.26), 0.0, 0.85),
        scarf=mat('scarf', (0.42, 0.36, 0.28), 0.0, 0.98),
        shoe=mat('shoe', (0.85, 0.85, 0.82), 0.0, 0.6),
        beanie=mat('beanie', (0.06, 0.06, 0.07), 0.0, 0.95),
        pink=mat('frame_pink', (0.85, 0.5, 0.6), 0.0, 0.3),
        carpaint=mat('paint_car', (0.5, 0.06, 0.07), 0.5, 0.25),
        gdark=mat('glass_dark', (0.015, 0.02, 0.025), 0.0, 0.06),
        plate=mat('plate', (0.85, 0.7, 0.1), 0.0, 0.5),
    )

# ---------------------------------------------------------------- van "Fidèle"
def build_van(M):
    md = 'fidele'
    st = [(-2.07, .70, .30, .80, 6, 1), (-2.03, .79, .26, .90, 7, 1), (-1.88, .805, .25, .99, 8, .96), (-1.5, .81, .25, 1.05, 8, .95),
          (-1.14, .81, .25, 1.11, 8, .93), (-0.96, .81, .25, 1.37, 8, .9), (-0.74, .81, .25, 1.63, 8, .89), (-0.6, .81, .25, 1.67, 8, .9),
          (-0.45, .81, .25, 1.68, 8, .9), (-0.42, .825, .25, 1.70, 10, .93), (-0.38, .825, .25, 1.89, 10, .95), (1.93, .825, .25, 1.89, 10, .95),
          (2.02, .81, .28, 1.86, 9, .94), (2.06, .76, .34, 1.80, 7, 1)]
    body = loft('van_body', st, 64, M['white'], md)
    cuts = []
    for x in (-1, 1):
        for z in (-1.28, 1.25):
            cuts.append(cutter(None, (x * .9, gy(z), .30), kind='cyl', r=.41, depth=.5, rot=(0, math.pi / 2, 0)))
        # window recesses (2 cm) for side cab windows and the rear cargo window on the left
        cuts.append(cutter((.06, .58, .42), (x * .835, gy(-0.72), 1.37), rot=(0, 0, 0)))
    cuts.append(cutter((.06, .78, .46), (-.85, gy(.55), 1.43)))
    for x in (-.42, .42): cuts.append(cutter((.6, .06, .48), (x, gy(2.08), 1.48)))
    cuts.append(cutter((1.46, .06, .62), (0, gy(-0.86), 1.37), rot=(0.64, 0, 0)))  # windscreen recess
    cuts.append(cutter((.012, .3, 1.5), (-.0, gy(2.07), 1.1)))  # rear door split
    for x in (-1, 1): cuts.append(cutter((.04, .012, 1.4), (x * .83, gy(-0.42), 1.0)))  # front door gap
    boolean(body, cuts)
    finish(body, bevel=.008)
    # wheel arch liners
    for x in (-1, 1):
        for z in (-1.28, 1.25):
            o = cyl('arch', .40, .22, (x * .74, gy(z), .30), M['plastic'], md, rot=(0, math.pi / 2, 0), verts=40)
            # keep only the upper half of the liner
            bm = bmesh.new(); bm.from_mesh(o.data)
            bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context='VERTS'); bm.to_mesh(o.data); bm.free()
            # flares
            box('flare', (.06, .95, .12), (x * .84, gy(z), .66), M['plastic'], md, bevel=.02)
    # glass
    for x in (-1, 1):
        box('cabwin', (.012, .56, .40), (x * .815, gy(-0.72), 1.37), M['glass'], md)
    box('cargowin', (.012, .76, .44), (-.83, gy(.55), 1.43), M['glass'], md)
    for x in (-.42, .42): box('rearwin', (.58, .012, .46), (x, gy(2.065), 1.48), M['glass'], md)
    box('windscreen', (1.44, .012, .6), (0, gy(-0.855), 1.37), M['glass'], md, rot=(0.64, 0, 0))
    # interior visible through the glass
    for x in (-.38, .38):
        box('seat_base', (.5, .5, .14), (x, gy(-0.45), .62), M['seat'], md, bevel=.04)
        box('seat_back', (.48, .12, .62), (x, gy(-0.2), 1.0), M['seat'], md, bevel=.05, rot=(.18, 0, 0))
        box('headrest', (.26, .1, .18), (x, gy(-0.15), 1.38), M['seat'], md, bevel=.04)
    box('dash', (1.5, .45, .2), (0, gy(-1.05), 1.0), M['dash'], md, bevel=.04)
    cyl('wheel_rim', .19, .03, (-.38, gy(-0.82), 1.08), M['dash'], md, rot=(1.1, 0, 0), verts=32)
    box('partition', (1.58, .04, 1.2), (0, gy(0.02), 1.05), M['dash'], md)
    box('cargo_floor', (1.58, 1.9, .04), (0, gy(1.0), .4), M['trim'], md)
    # bumpers, grille, lights
    box('bumper_f', (1.66, .22, .27), (0, gy(-2.02), .38), M['plastic'], md, bevel=.05)
    box('bumper_r', (1.66, .2, .26), (0, gy(2.03), .42), M['plastic'], md, bevel=.05)
    box('grille', (.62, .04, .24), (0, gy(-2.075), .76), M['plastic'], md, bevel=.01)
    for k in range(3): box('slat', (.6, .02, .025), (0, gy(-2.09), .68 + k * .075), M['trim'], md)
    for x in (-1, 1):
        box('hl_bezel', (.4, .04, .26), (x * .52, gy(-2.065), .77), M['chrome'], md, bevel=.01)
        box('hl_lens', (.35, .03, .21), (x * .52, gy(-2.082), .77), M['head'], md, bevel=.01)
        box('indicator', (.33, .03, .07), (x * .52, gy(-2.085), .55), M['orange'], md)
        box('tail', (.15, .03, .34), (x * .66, gy(2.075), .66), M['tail'], md, bevel=.008)
        box('tail_ind', (.15, .03, .07), (x * .66, gy(2.075), .86), M['orange'], md)
        box('strip', (.03, 3.7, .11), (x * .832, gy(.05), .74), M['trim'], md, bevel=.01)
        box('mirror', (.08, .14, .2), (x * .97, gy(-1.0), 1.2), M['plastic'], md, bevel=.03)
        box('mirror_arm', (.14, .04, .03), (x * .89, gy(-.95), 1.18), M['plastic'], md)
        box('handle', (.02, .18, .04), (x * .83, gy(-.55), 1.02), M['chrome'], md, bevel=.008)
        box('wiper', (.55, .03, .02), (x * .3, gy(-1.08), 1.13), M['plastic'], md, rot=(0, x * .12, 0))
    box('rear_handle', (.14, .03, .04), (.14, gy(2.078), 1.08), M['chrome'], md, bevel=.008)
    # roof refrigeration unit (comic detail)
    box('roof_unit', (1.32, 1.05, .22), (0, gy(.45), 1.99), M['white'], md, bevel=.05)
    for k in range(5): box('roof_grille', (.1, .02, .12), (-.4 + k * .2, gy(-.08), 1.99), M['steel'], md)
    cyl('antenna', .008, .5, (.55, gy(-.25), 2.15), M['plastic'], md, verts=8)

# ---------------------------------------------------------------- hypercar "Smaragd"
def build_sup(M):
    md = 'smaragd'
    st = [(-2.37, .62, .17, .36, 3.2, 1), (-2.3, .80, .13, .45, 4, .92), (-2.15, .90, .11, .55, 4.4, .82), (-1.9, .96, .11, .64, 4.8, .72),
          (-1.6, .99, .12, .71, 5, .66), (-1.3, .99, .13, .74, 5, .62), (-1.0, .97, .14, .74, 5, .64), (-0.7, .92, .15, .74, 5, .7),
          (-0.3, .89, .15, .75, 5, .74), (0.1, .9, .15, .77, 5, .74), (0.5, .97, .15, .82, 5, .68), (0.9, 1.0, .16, .85, 5, .63),
          (1.3, 1.0, .17, .86, 5, .62), (1.7, .98, .19, .85, 5, .66), (2.05, .93, .25, .81, 6, .74), (2.3, .87, .31, .76, 6, .8), (2.39, .83, .34, .73, 6, 1)]
    body = loft('sup_body', st, 72, M['green'], md)
    cuts = []
    for x in (-1, 1):
        for z, r in ((-1.42, .43), (1.46, .44)):
            cuts.append(cutter(None, (x * 1.0, gy(z), .37), kind='cyl', r=r, depth=.6, rot=(0, math.pi / 2, 0)))
        cuts.append(cutter((.5, .95, .34), (x * 1.08, gy(.75), .5), rot=(0, 0, x * -.25)))        # side intake scoop
        cuts.append(cutter((.36, .5, .14), (x * .62, gy(-2.25), .5), rot=(0, x * .3, 0)))         # headlight recess
        cuts.append(cutter((.34, .4, .2), (x * .44, gy(-2.4), .34), rot=(0, x * .4, 0)))          # lower intakes
    cuts.append(cutter((.9, .4, .14), (0, gy(-2.42), .3)))
    cuts.append(cutter((1.3, 2.4, .6), (0, gy(.15), 1.05)))                                      # cockpit opening
    boolean(body, cuts)
    finish(body, bevel=.006)
    canopy = loft('sup_canopy', [(-1.2, .46, .69, .71, 2.4, 1), (-.85, .62, .69, .96, 2.6, .72), (-.35, .67, .70, 1.12, 2.6, .62), (.15, .65, .72, 1.15, 2.6, .56),
                                 (.65, .57, .76, 1.08, 2.6, .52), (1.15, .42, .80, .96, 2.4, 1), (1.5, .2, .83, .88, 2.2, 1)], 48, M['glass'], md)
    spine = loft('sup_spine', [(-.15, .05, 1.08, 1.13, 3, 1), (.2, .13, 1.05, 1.2, 3, 1), (.75, .16, 1.0, 1.2, 3, 1), (1.4, .14, .86, 1.05, 3, 1), (2.0, .1, .8, .9, 3, 1)], 24, M['green'], md)
    box('snorkel', (.16, .06, .1), (0, gy(.18), 1.17), M['carbon'], md, bevel=.01)
    for x in (-1, 1):
        for z, r in ((-1.42, .42), (1.46, .43)):
            o = cyl('arch', r, .3, (x * .86, gy(z), .37), M['carbon'], md, rot=(0, math.pi / 2, 0), verts=40)
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context='VERTS'); bm.to_mesh(o.data); bm.free()
        box('intake_back', (.06, .9, .3), (x * .86, gy(.75), .5), M['carbon'], md)
        for k in range(4): box('intake_fin', (.16, .02, .26), (x * .9, gy(.45 + k * .2), .5), M['carbon'], md, rot=(0, 0, x * -.25))
        box('hl_house', (.3, .22, .06), (x * .6, gy(-2.18), .5), M['carbon'], md, rot=(0, x * .3, 0))
        box('hl_led', (.3, .03, .025), (x * .62, gy(-2.33), .53), M['led'], md, rot=(0, x * .3, 0))
        box('hl_led2', (.03, .2, .025), (x * .76, gy(-2.2), .52), M['led'], md, rot=(0, x * .3, 0))
        box('side_blade', (.05, 2.2, .12), (x * .95, gy(-.3), .25), M['carbon'], md, bevel=.01)
        box('mirror', (.16, .12, .08), (x * .78, gy(-.55), .9), M['green'], md, bevel=.03)
        box('mirror_stalk', (.12, .03, .03), (x * .7, gy(-.55), .86), M['carbon'], md)
        cyl('exhaust', .07, .14, (x * .24, gy(1.75), .86), M['steel'], md, verts=24)
        box('wing_pylon', (.04, .18, .22), (x * .5, gy(2.0), .95), M['carbon'], md, bevel=.01)
    box('splitter', (1.75, .38, .04), (0, gy(-2.22), .12), M['carbon'], md, bevel=.01)
    box('wing', (1.66, .34, .035), (0, gy(2.06), 1.07), M['green'], md, bevel=.012)
    box('tail_bar', (1.62, .03, .035), (0, gy(2.385), .7), M['tail'], md)
    box('diffuser', (1.5, .4, .03), (0, gy(2.3), .2), M['carbon'], md)
    for k in range(5): box('diff_fin', (.02, .4, .16), (-.6 + k * .3, gy(2.25), .25), M['carbon'], md)
    for x in (-.33, .33):
        box('seat', (.48, .55, .12), (x, gy(.2), .48), M['seat'], md, bevel=.04)
        box('seat_back', (.46, .12, .58), (x, gy(.48), .74), M['seat'], md, bevel=.05, rot=(-.35, 0, 0))
    box('dash', (1.2, .3, .14), (0, gy(-.55), .74), M['carbon'], md, bevel=.03)
    cyl('steer', .16, .03, (-.33, gy(-.38), .82), M['carbon'], md, rot=(1.2, 0, 0), verts=24)

# ---------------------------------------------------------------- everyday cars (generic present-day shapes, no real model)
def beam(name, p0, p1, thick, material, model):
    """a bar between two points given in game coordinates (x, y_up, z)"""
    a = Vector((p0[0], -p0[2], p0[1])); b = Vector((p1[0], -p1[2], p1[1])); d = b - a
    o = box(name, (thick[0], d.length, thick[1]), tuple((a + b) / 2), material, model, bevel=min(thick) * .3)
    o.rotation_euler = d.to_track_quat('Y', 'Z').to_euler(); return o

def build_city_car(M, md, L, W, H, hood, belt, gc, wr, zf, zr, kind):
    h = L / 2; w = W / 2
    tail = belt - .03 if kind == 'sedan' else belt + .05
    st = [(-h, w * .60, gc + .17, hood - .22, 4, 1), (-h + .05, w * .80, gc + .08, hood - .13, 5, 1), (-h + .24, w * .955, gc + .02, hood - .05, 6, .98),
          (zf - .12, w, gc, hood, 7, .96), (zf + .5, w, gc, belt - .05, 7, .94), (zf + .95, w, gc, belt, 8, .93), (.1, w, gc, belt + .012, 8, .93),
          (zr - .3, w, gc, belt + .03, 8, .93), (zr + .38, w * .99, gc + .01, tail, 7, .94), (h - .22, w * .945, gc + .04, tail - .02, 6, .96),
          (h - .05, w * .82, gc + .1, tail - .09, 5, 1), (h, w * .64, gc + .19, tail - .2, 4, 1)]
    body = loft(md + '_body', st, 40, M['carpaint'], md)
    cuts = []
    for x in (-1, 1):
        for z in (zf, zr): cuts.append(cutter(None, (x * w, gy(z), wr), kind='cyl', r=wr + .065, depth=.56, rot=(0, math.pi / 2, 0)))
        for z in (zf + .58, .16, zr - .5): cuts.append(cutter((.05, .014, belt - gc - .16), (x * w, gy(z), (gc + belt) / 2 + .06)))   # door gaps
    boolean(body, cuts)
    for p in body.data.polygons: p.use_smooth = True
    # glasshouse: one dark glass volume with a painted roof and pillars
    a = zf + .46
    c, b = {'sedan': (zr - .42, zr + .5), 'hatch': (zr + .22, zr + .62), 'suv': (zr + .3, zr + .64)}[kind]
    gb = belt - .07
    cab = [(a, w * .86, gb, belt + .02, 5, .92), (a + .36, w * .885, gb, belt + (H - belt) * .56, 5, .85), (a + .8, w * .9, gb, H - .025, 5, .8), (.25, w * .9, gb, H - .005, 5, .8),
           (c, w * .9, gb, H - .03, 5, .8), (c + (b - c) * .62, w * .885, gb, belt + (H - belt) * .5, 5, .85), (b, w * .86, gb, belt + .03, 5, .92)]
    loft(md + '_cabin', cab, 32, M['gdark'], md)
    roof = [(a + .7, w * .64, H - .09, H - .03, 6, 1), (a + .92, w * .715, H - .06, H + .008, 6, 1), (.25, w * .72, H - .05, H + .02, 6, 1), (c - .08, w * .715, H - .06, H + .006, 6, 1), (c + .14, w * .64, H - .1, H - .04, 6, 1)]
    loft(md + '_roof', roof, 24, M['carpaint'], md)
    for x in (-1, 1):
        beam('pillar_a', (x * w * .83, belt - .01, a + .03), (x * w * .70, H - .04, a + .8), (.075, .06), M['carpaint'], md)
        beam('pillar_c', (x * w * .70, H - .05, c + .02), (x * w * .83, belt, b - .03), (.11 if kind != 'sedan' else .09, .06), M['carpaint'], md)
        beam('pillar_b', (x * w * .86, belt - .02, .16), (x * w * .715, H - .04, .2), (.075, .03), M['plastic'], md)
        beam('roofrail', (x * w * .71, H - .03, a + .82), (x * w * .71, H - .03, c - .02), (.05, .035), M['carpaint'], md)
        # wheel arch liners
        for z in (zf, zr):
            o = cyl('arch', wr + .06, .26, (x * (w - .16), gy(z), wr), M['plastic'], md, rot=(0, math.pi / 2, 0), verts=32)
            bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -0.02], context='VERTS'); bm.to_mesh(o.data); bm.free()
        # lights: slim LED headlamps with a dark housing, tail clusters joined by a light bar
        box('hl_house', (.46, .16, .115), (x * w * .60, gy(-h + .07), hood - .2), M['plastic'], md, bevel=.02, rot=(0, 0, -x * .22))
        box('hl_led', (.36, .05, .045), (x * w * .60, gy(-h - .005), hood - .185), M['led'], md, bevel=.012, rot=(0, 0, -x * .22))
        box('hl_drl', (.2, .04, .02), (x * w * .62, gy(-h - .005), hood - .245), M['head'], md, rot=(0, 0, -x * .22))
        box('fog', (.2, .04, .05), (x * w * .66, gy(-h + .02), gc + .2), M['plastic'], md, bevel=.01)
        box('tl_cluster', (.34, .07, .12), (x * w * .62, gy(h - .02), tail - .16), M['tail'], md, bevel=.02, rot=(0, 0, x * .2))
        box('ind_r', (.12, .05, .04), (x * w * .74, gy(h - .04), tail - .26), M['orange'], md, rot=(0, 0, x * .3))
        box('mirror', (.2, .12, .11), (x * (w + .09), gy(a + .2), belt + .07), M['carpaint'], md, bevel=.035)
        box('mirror_arm', (.12, .05, .03), (x * (w - .0), gy(a + .2), belt + .03), M['plastic'], md)
        for z in (zf + .95, .5): box('handle', (.025, .17, .035), (x * (w * .985), gy(z), belt - .12), M['chrome'], md, bevel=.01)
        box('sill', (.05, zr - zf - 2 * wr - .25, .1), (x * (w - .02), gy((zf + zr) / 2), gc + .07), M['plastic'], md, bevel=.02)
        if kind == 'suv':
            box('rail', (.035, 1.5, .035), (x * w * .62, gy(.35), H + .05), M['steel'], md, bevel=.012)
            for z in (zf, zr):
                o = cyl('clad', wr + .1, .1, (x * (w - .03), gy(z), wr), M['plastic'], md, rot=(0, math.pi / 2, 0), verts=32)
                bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < 0.0 or v.co.length < wr + .03], context='VERTS'); bm.to_mesh(o.data); bm.free()
    box('tl_bar', (W * .62, .05, .035), (0, gy(h - .005), tail - .15), M['tail'], md, bevel=.01)
    box('grille', (W * .46, .06, .13), (0, gy(-h - .0), gc + .34), M['plastic'], md, bevel=.02)
    box('intake', (W * .62, .06, .09), (0, gy(-h + .015), gc + .16), M['plastic'], md, bevel=.02)
    box('badge', (.09, .02, .05), (0, gy(-h - .012), hood - .2), M['chrome'], md, bevel=.01)
    box('plate_f', (.5, .02, .11), (0, gy(-h - .035), gc + .34), M['plate'], md)
    box('plate_r', (.5, .02, .11), (0, gy(h + .012), tail - .3), M['plate'], md)
    box('diffuser', (W * .66, .08, .1), (0, gy(h - .03), gc + .14), M['plastic'], md, bevel=.02)
    box('wiper', (.6, .03, .02), (-.1, gy(a + .1), belt + .06), M['plastic'], md)
    # a simple interior so the cabin is not empty when seen through the open sides of the glass
    box('floor', (W * .8, zr - zf, .05), (0, gy((zf + zr) / 2), gc + .12), M['trim'], md)

CITY_CARS = {  # L, W, H, bonnet, beltline, ground clearance, wheel radius, front axle z, rear axle z, shape
    'kompakt': (4.06, 1.77, 1.47, .93, .99, .17, .31, -1.24, 1.30, 'hatch'),
    'limo': (4.72, 1.84, 1.43, .90, .96, .15, .33, -1.44, 1.42, 'sedan'),
    'suv': (4.46, 1.88, 1.67, 1.08, 1.14, .22, .36, -1.34, 1.36, 'suv'),
}

# ---------------------------------------------------------------- characters
def skin_body(name, chain, material, model, sub=2):
    """chain: list of (vertex position, radius) pairs plus edges; builds an organic shape with the Skin modifier."""
    verts = [p for p, r in chain['v']]; edges = chain['e']
    me = bpy.data.meshes.new(name); me.from_pydata(verts, edges, []); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.collection.objects.link(o)
    o.data.materials.append(material); o['model'] = model
    sm = o.modifiers.new('skin', 'SKIN')
    for i, (p, r) in enumerate(chain['v']):
        rv = r if isinstance(r, tuple) else (r, r)
        o.data.skin_vertices[0].data[i].radius = rv
    o.data.skin_vertices[0].data[0].use_root = True
    ss = o.modifiers.new('sub', 'SUBSURF'); ss.levels = sub; ss.render_levels = sub
    return o

def person(M, who, seated=False):
    md = who + ('_seat' if seated else '_stand')
    if who == 'leo':
        top, bottom, hair, skinm = M['denim'], M['jogger'], M['hair_dark'], M['skin']
    else:
        top, bottom, hair, skinm = M['knit'], M['jeans'], M['hair_brown'], M['skin2']
    h = 1.0 if not seated else 0.0
    if not seated:
        legs = {'v': [((0, 0, .98), (.17, .11)), ((-.1, 0, .9), .085), ((-.11, .01, .5), .068), ((-.11, 0, .1), .05),
                      ((.1, 0, .9), .085), ((.11, .01, .5), .068), ((.11, 0, .1), .05)],
                'e': [(0, 1), (1, 2), (2, 3), (0, 4), (4, 5), (5, 6)]}
        skin_body('legs', legs, bottom, md)
        for x in (-.11, .11): box('shoe', (.11, .27, .09), (x, .05, .05), M['shoe'], md, bevel=.035)
    base = .98 if not seated else .45
    torso = {'v': [((0, 0, base), (.17, .11)), ((0, 0, base + .25), (.16, .1)), ((0, 0, base + .5), (.2, .12)), ((-.2, 0, base + .5), .065),
                   ((-.26, .02, base + .2), .055), ((-.27, .04, base - .05), .045), ((.2, 0, base + .5), .065), ((.26, .02, base + .2), .055), ((.27, .04, base - .05), .045)],
             'e': [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (2, 6), (6, 7), (7, 8)]}
    if seated:
        torso['v'][4] = ((-.24, -.18, base + .25), .055); torso['v'][5] = ((-.2, -.35, base + .3), .045)
        torso['v'][7] = ((.24, -.18, base + .25), .055); torso['v'][8] = ((.2, -.35, base + .3), .045)
    skin_body('torso', torso, top, md)
    for x in (-1, 1):
        sphere('hand', .045, (x * .27 if not seated else x * .2, .04 if not seated else -.38, base - .1 if not seated else base + .3), skinm, md)
    hz = base + .72
    cyl('neck', .055, .12, (0, 0, base + .58), skinm, md, verts=16)
    sphere('head', .11, (0, 0, hz), skinm, md, scale=(.92, 1.0, 1.18))
    sphere('nose', .02, (0, -.105, hz - .01), skinm, md, scale=(.8, 1, 1.2), seg=12, ring=8)
    for x in (-1, 1): sphere('ear', .025, (x * .1, 0, hz), skinm, md, scale=(.5, 1, 1.3), seg=12, ring=8)
    eye = M.get('eye') or mat('eye', (0.03, 0.02, 0.015), 0.0, 0.1); M['eye'] = eye
    white = M.get('eyewhite') or mat('eyewhite', (0.85, 0.83, 0.8), 0.0, 0.3); M['eyewhite'] = white
    lips = M.get('lips') or mat('lips', (0.6, 0.3, 0.28), 0.0, 0.5); M['lips'] = lips
    for x in (-1, 1):
        sphere('eyewhite', .017, (x * .038, -.093, hz + .012), white, md, scale=(1, .6, .8), seg=12, ring=8)
        sphere('pupil', .009, (x * .038, -.104, hz + .012), eye, md, seg=10, ring=6)
        box('brow', (.035, .01, .008), (x * .04, -.1, hz + .04), hair, md, rot=(0, x * .12, 0))
    sphere('mouth', .022, (0, -.098, hz - .045), lips, md, scale=(1.2, .4, .45), seg=12, ring=8)
    if who == 'leo':
        sphere('beard', .1, (0, -.03, hz - .07), hair, md, scale=(.95, .9, .75))
        sphere('beanie', .118, (0, .01, hz + .06), M['beanie'], md, scale=(1, 1.03, .85))
        if not seated: cyl('scarf', .1, .1, (0, 0, base + .56), M['scarf'], md, verts=24, bevel=.03)
    else:
        sphere('hair', .118, (0, .02, hz + .03), hair, md, scale=(1.04, 1.04, 1.05))
        sphere('bun', .065, (0, .07, hz + .15), hair, md)
        for x in (-1, 1):
            bpy.ops.mesh.primitive_torus_add(major_segments=24, minor_segments=6, major_radius=.032, minor_radius=.005, location=(x * .042, -.112, hz + .005), rotation=(math.pi / 2, 0, 0))
            o = bpy.context.active_object; o.data.materials.append(M['pink']); o['model'] = md
        box('bridge', (.025, .006, .006), (0, -.115, hz + .01), M['pink'], md)

# ---------------------------------------------------------------- export
def export(path):
    dg = bpy.context.evaluated_depsgraph_get()
    groups = {}
    for o in bpy.context.scene.objects:
        if o.type != 'MESH' or o.get('cutter') or 'model' not in o: continue
        ev = o.evaluated_get(dg); me = ev.to_mesh()
        me.calc_loop_triangles()
        mw = o.matrix_world; nm = mw.to_3x3().inverted().transposed()
        mname = me.materials[0].name if me.materials else 'default'
        key = (o['model'], mname)
        g = groups.setdefault(key, {'map': {}, 'v': [], 'i': []})
        cn = me.corner_normals if hasattr(me, 'corner_normals') else None
        for tri in me.loop_triangles:
            idx = []
            for li in tri.loops:
                v = mw @ me.vertices[me.loops[li].vertex_index].co
                n = (nm @ (cn[li].vector if cn else me.loops[li].normal)).normalized()
                p = (v.x, v.z, -v.y); nn = (n.x, n.z, -n.y)
                k = (round(p[0], 4), round(p[1], 4), round(p[2], 4), round(nn[0], 2), round(nn[1], 2), round(nn[2], 2))
                if k not in g['map']:
                    g['map'][k] = len(g['v']); g['v'].append((p, nn))
                idx.append(g['map'][k])
            g['i'].extend(idx)
        ev.to_mesh_clear()
    blobs, meta, off = [], [], 0
    for (model, mname), g in sorted(groups.items()):
        vs = g['v']
        lo = [min(p[0][k] for p in vs) for k in range(3)]; hi = [max(p[0][k] for p in vs) for k in range(3)]
        sc = [max(hi[k] - lo[k], 1e-6) / 65535 for k in range(3)]
        b = bytearray()
        for (p, n) in vs:
            b += struct.pack('<HHHh', *[int(round((p[k] - lo[k]) / sc[k])) for k in range(3)], 0)
            b += struct.pack('<bbbb', *[int(round(max(-1, min(1, n[k])) * 127)) for k in range(3)], 0)
        big = len(vs) > 65535
        ib = struct.pack('<%d%s' % (len(g['i']), 'I' if big else 'H'), *g['i'])
        if len(ib) % 4: ib += b'\0' * (4 - len(ib) % 4)
        meta.append({'model': model, 'mat': mname, 'nv': len(vs), 'ni': len(g['i']), 'big': big, 'lo': lo, 'sc': sc, 'vo': off, 'io': off + len(b)})
        blobs.append(bytes(b) + ib); off += len(b) + len(ib)
    head = json.dumps(meta).encode()
    pad = (4 - (len(head) + 4) % 4) % 4; head += b' ' * pad
    with open(path, 'wb') as f:
        f.write(struct.pack('<I', len(head))); f.write(head); f.write(b''.join(blobs))
    tris = sum(m['ni'] // 3 for m in meta)
    print('wrote', path, os.path.getsize(path) // 1024, 'KB', len(meta), 'groups', tris, 'triangles')
    for m in meta: print('  ', m['model'], m['mat'], m['nv'], 'verts', m['ni'] // 3, 'tris')

def place_for_render():
    """Lay the models out side by side and render a preview with Cycles."""
    off = {'fidele': (-2.6, 60), 'smaragd': (2.6, 60), 'kompakt': (-2.4, -1), 'limo': (0, -1), 'suv': (2.4, -1), 'leo_stand': (-0.6, 64.2), 'mira_stand': (0.4, 64.2), 'leo_seat': (99, 0), 'mira_seat': (99, 0)}
    for o in bpy.context.scene.objects:
        if 'model' in o:
            dx, dy = off.get(o['model'], (0, 0)); o.location.x += dx; o.location.y += dy
            pass
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.samples = 48; sc.cycles.device = 'CPU'
    sc.render.resolution_x, sc.render.resolution_y = 1280, 720
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    bg = w.node_tree.nodes['Background']; bg.inputs[0].default_value = (0.55, 0.6, 0.7, 1); bg.inputs[1].default_value = 0.6
    bpy.ops.mesh.primitive_plane_add(size=60); fl = bpy.context.active_object; fl.data.materials.append(mat('floor', (0.18, 0.18, 0.19), 0, 0.5))
    bpy.ops.object.light_add(type='SUN', rotation=(0.9, 0.2, 0.6)); bpy.context.active_object.data.energy = 3.5
    bpy.ops.object.camera_add(location=(6.5, 9.0, 3.0)); cam = bpy.context.active_object; sc.camera = cam
    d = Vector((0, -1.2, 0.8)) - cam.location; cam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); cam.data.lens = 32

def main():
    reset(); M = materials()
    build_van(M); build_sup(M)
    for md, spec in CITY_CARS.items(): build_city_car(M, md, *spec)
    for who in ('leo', 'mira'):
        person(M, who, seated=False); person(M, who, seated=True)
    export(OUT)
    if RENDER:
        place_for_render()
        bpy.context.scene.render.filepath = sys.argv[2] if len(sys.argv) > 2 else '/tmp/preview.png'
        bpy.ops.render.render(write_still=True)

main()
