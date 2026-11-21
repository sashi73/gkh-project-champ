/* GKH Project Champ: 🏗 BIM and construction files read in the browser, for "Start from a document" and the project Documents.
   - IFC (.ifc, any size: streamed): project, site, buildings, levels; every element by class and type with its count and quantities
     (area, volume, length, weight from the base quantities or the Revit dimensions), materials, rooms. Written out as text for the AI:
     the work breakdown by level and trade, and the MODEL QUANTITY TAKE-OFF the BOM / BOQ is drafted from.
   - Navisworks TimeLiner (CSV) and MS Project XML: the schedule, task by task.
   - Navisworks Clash Detective report (XML): each clash with its status, location and the two items (coordination issues and risks).
   - DXF: layers, blocks and the text on the drawing (title block, notes, schedules).
   Revit (.rvt), Navisworks (.nwd .nwc .nwf), AutoCAD (.dwg .dwf) are closed formats: they are kept as the original file, with a tip on what to export. */
(function (root) {
  'use strict';
  var KEEP = /\.(rvt|rfa|rte|rft|nwd|nwc|nwf|dwg|dwf|dwfx)$/i;
  var READ = /\.(ifc|dxf|xml)$/i;
  function tipFor(name) {
    var n = String(name || '').toLowerCase();
    if (/\.(rvt|rfa|rte|rft)$/.test(n)) return 'Revit file: Champ cannot open Revit models directly. In Revit use File > Export > IFC (tick "Export base quantities") and add the .ifc here; export the quantity schedules too (File > Export > Reports > Schedule, or to Excel) so the BOM / BOQ uses your own take-off.';
    if (/\.(nwd|nwc|nwf)$/.test(n)) return 'Navisworks file: Champ cannot open Navisworks models directly. Export the TimeLiner schedule (TimeLiner > Export > CSV or MS Project XML) and the Clash Detective report (Report > XML), and add those here. For the model itself, export IFC from the design tool.';
    if (/\.(dwg|dwf|dwfx)$/.test(n)) return 'AutoCAD file: Champ cannot open DWG or DWF drawings directly. Plot or export the sheets to PDF (the AI reads the title blocks, notes and schedules), or save the drawing as DXF, and add that here.';
    return '';
  }
  var fmt = function (v, d) { return Number(v || 0).toLocaleString('en-AU', { maximumFractionDigits: d == null ? 1 : d }); };
  var mb = function (n) { return n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };

  /* ---------- IFC (STEP) ---------- */
  function decodeStr(s) {
    return s.replace(/''/g, "'").replace(/\\X2\\([0-9A-F]+)\\X0\\/gi, function (m, h) { var o = ''; for (var i = 0; i + 4 <= h.length; i += 4) o += String.fromCharCode(parseInt(h.substr(i, 4), 16)); return o; })
      .replace(/\\X\\([0-9A-F]{2})/gi, function (m, h) { return String.fromCharCode(parseInt(h, 16)); }).replace(/\\S\\(.)/g, function (m, c) { return String.fromCharCode(c.charCodeAt(0) + 128); });
  }
  // the arguments of one record: strings, #refs {r}, numbers, null ($ and *), enums {e}, lists [], typed values {t, v}
  function args(s) {
    var i = 0, n = s.length;
    function val() {
      while (i < n && (s[i] === ' ' || s[i] === '\n' || s[i] === '\r' || s[i] === '\t')) i++;
      var c = s[i];
      if (c === "'") { var j = i + 1, o = ''; while (j < n) { if (s[j] === "'") { if (s[j + 1] === "'") { o += "''"; j += 2; continue; } break; } o += s[j++]; } i = j + 1; return decodeStr(o); }
      if (c === '#') { var k = i + 1; while (k < n && s[k] >= '0' && s[k] <= '9') k++; var r = { r: +s.slice(i + 1, k) }; i = k; return r; }
      if (c === '$' || c === '*') { i++; return null; }
      if (c === '.') { var e = s.indexOf('.', i + 1); var en = s.slice(i + 1, e); i = e + 1; return { e: en }; }
      if (c === '(') { i++; return list(); }
      if (/[A-Za-z]/.test(c)) { var t = i; while (i < n && /[A-Za-z0-9_]/.test(s[i])) i++; var ty = s.slice(t, i).toUpperCase(); while (s[i] === ' ') i++; if (s[i] === '(') { i++; var L = list(); return { t: ty, v: L[0] }; } return { e: ty }; }
      var m = i; while (i < n && /[-+0-9.Ee]/.test(s[i])) i++; return parseFloat(s.slice(m, i));
    }
    function list() {
      var out = [];
      while (i < n) {
        while (i < n && (s[i] === ' ' || s[i] === '\n' || s[i] === '\r' || s[i] === '\t')) i++;
        if (s[i] === ')') { i++; return out; }
        out.push(val());
        while (i < n && (s[i] === ' ' || s[i] === '\n' || s[i] === '\r' || s[i] === '\t')) i++;
        if (s[i] === ',') i++;
      }
      return out;
    }
    return list();
  }
  // geometry, styles and presentation: most of a model's size and nothing the plan needs (never kept)
  var SKIP = /^IFC(CARTESIAN|DIRECTION|AXIS[12]|LOCALPLACEMENT|POLY|FACE|CLOSEDSHELL|OPENSHELL|CONNECTEDFACESET|SHELLBASED|FACETEDBREP|ADVANCEDBREP|ADVANCEDFACE|SHAPEREPRESENTATION|PRODUCTDEFINITIONSHAPE|EXTRUDED|REVOLVED|SWEPT|SURFACECURVE|INDEXED|TRIANGULATED|STYLEDITEM|STYLEDREPRESENTATION|SURFACESTYLE|PRESENTATION|CURVESTYLE|FILLAREA|TEXTSTYLE|COLOURRGB|MAPPEDITEM|REPRESENTATIONMAP|VECTOR|LINE$|TRIMMEDCURVE|CIRCLE|ELLIPSE|COMPOSITECURVE|PLANE$|BOOLEAN|HALFSPACE|POLYGONALBOUNDED|.*PROFILEDEF$|BSPLINE|RATIONALBSPLINE|EDGE|VERTEX|ORIENTEDEDGE|GEOMETRICREPRESENTATION|GEOMETRICCURVESET|BOUNDINGBOX|BLOCK$|SPHERE|SHAPEASPECT|OWNERHISTORY|PERSON|ORGANIZATION|APPLICATION|ACTORROLE|TELECOMADDRESS|DIMENSIONALEXPONENTS|CARTESIANTRANSFORMATION|OFFSETCURVE|SURFACEOFLINEAREXTRUSION|CYLINDRICALSURFACE|RECTANGULARTRIMMEDSURFACE|PCURVE|DRAUGHTINGPREDEFINED|ANNOTATION|TEXTLITERAL|PLANARBOX)/;
  // the quantities that add up (thickness, width and height do not)
  var QA = ['NetSideArea', 'NetArea', 'NetFootprintArea', 'NetFloorArea', 'NetSurfaceArea', 'GrossSideArea', 'GrossArea', 'GrossFootprintArea', 'GrossFloorArea', 'Area', 'GrossSurfaceArea', 'OuterSurfaceArea', 'NetCeilingArea'];
  var QV = ['NetVolume', 'GrossVolume', 'Volume'], QL = ['Length', 'NetLength', 'GrossLength', 'Cut Length'], QW = ['NetWeight', 'GrossWeight', 'Weight', 'Mass'];
  var PROP_KEEP = /^IFCPROPERTYSINGLEVALUE\s*\(\s*'(Area|Volume|Length|Cut Length|NetArea|NetVolume|GrossArea|GrossVolume|NetSideArea|GrossSideArea|NetFloorArea|GrossFloorArea|Weight|NetWeight|GrossWeight|IsExternal|LoadBearing|Reference)'/i;
  var CLASS = {
    IFCWALL: ['Walls', 'Walls and partitions'], IFCWALLSTANDARDCASE: ['Walls', 'Walls and partitions'], IFCWALLELEMENTEDCASE: ['Walls', 'Walls and partitions'], IFCCURTAINWALL: ['Curtain walls', 'Envelope (roof, facade, windows)'],
    IFCSLAB: ['Slabs and floors', 'Structure'], IFCSLABSTANDARDCASE: ['Slabs and floors', 'Structure'], IFCROOF: ['Roofs', 'Envelope (roof, facade, windows)'], IFCBEAM: ['Beams', 'Structure'], IFCBEAMSTANDARDCASE: ['Beams', 'Structure'],
    IFCCOLUMN: ['Columns', 'Structure'], IFCCOLUMNSTANDARDCASE: ['Columns', 'Structure'], IFCMEMBER: ['Members (framing, mullions)', 'Structure'], IFCMEMBERSTANDARDCASE: ['Members (framing, mullions)', 'Structure'], IFCPLATE: ['Plates and panels', 'Envelope (roof, facade, windows)'], IFCPLATESTANDARDCASE: ['Plates and panels', 'Envelope (roof, facade, windows)'],
    IFCFOOTING: ['Footings', 'Substructure (footings, piles)'], IFCPILE: ['Piles', 'Substructure (footings, piles)'], IFCREINFORCINGBAR: ['Reinforcing bars', 'Structure'], IFCREINFORCINGMESH: ['Reinforcing mesh', 'Structure'], IFCTENDON: ['Tendons', 'Structure'],
    IFCDOOR: ['Doors', 'Doors, windows and openings'], IFCDOORSTANDARDCASE: ['Doors', 'Doors, windows and openings'], IFCWINDOW: ['Windows', 'Doors, windows and openings'], IFCWINDOWSTANDARDCASE: ['Windows', 'Doors, windows and openings'],
    IFCSTAIR: ['Stairs', 'Stairs, ramps and railings'], IFCSTAIRFLIGHT: ['Stair flights', 'Stairs, ramps and railings'], IFCRAMP: ['Ramps', 'Stairs, ramps and railings'], IFCRAMPFLIGHT: ['Ramp flights', 'Stairs, ramps and railings'], IFCRAILING: ['Railings', 'Stairs, ramps and railings'],
    IFCCOVERING: ['Coverings (ceilings, floor and wall finishes)', 'Finishes'], IFCFURNISHINGELEMENT: ['Furniture and fittings', 'Fit-out and furniture'], IFCFURNITURE: ['Furniture', 'Fit-out and furniture'], IFCSYSTEMFURNITUREELEMENT: ['System furniture', 'Fit-out and furniture'],
    IFCDUCTSEGMENT: ['Ducts', 'Mechanical (HVAC)'], IFCDUCTFITTING: ['Duct fittings', 'Mechanical (HVAC)'], IFCAIRTERMINAL: ['Air terminals (grilles, diffusers)', 'Mechanical (HVAC)'], IFCFAN: ['Fans', 'Mechanical (HVAC)'], IFCUNITARYEQUIPMENT: ['HVAC units', 'Mechanical (HVAC)'], IFCAIRTOAIRHEATRECOVERY: ['Heat recovery units', 'Mechanical (HVAC)'], IFCCHILLER: ['Chillers', 'Mechanical (HVAC)'], IFCBOILER: ['Boilers', 'Mechanical (HVAC)'], IFCDAMPER: ['Dampers', 'Mechanical (HVAC)'], IFCCOIL: ['Coils', 'Mechanical (HVAC)'],
    IFCPIPESEGMENT: ['Pipes', 'Hydraulic and fire services'], IFCPIPEFITTING: ['Pipe fittings', 'Hydraulic and fire services'], IFCSANITARYTERMINAL: ['Sanitary fixtures', 'Hydraulic and fire services'], IFCVALVE: ['Valves', 'Hydraulic and fire services'], IFCPUMP: ['Pumps', 'Hydraulic and fire services'], IFCTANK: ['Tanks', 'Hydraulic and fire services'], IFCFIRESUPPRESSIONTERMINAL: ['Sprinklers and fire terminals', 'Hydraulic and fire services'], IFCWASTETERMINAL: ['Waste fittings', 'Hydraulic and fire services'],
    IFCCABLECARRIERSEGMENT: ['Cable trays and conduits', 'Electrical and communications'], IFCCABLECARRIERFITTING: ['Cable tray fittings', 'Electrical and communications'], IFCCABLESEGMENT: ['Cables', 'Electrical and communications'], IFCLIGHTFIXTURE: ['Light fittings', 'Electrical and communications'], IFCLAMP: ['Lamps', 'Electrical and communications'], IFCOUTLET: ['Outlets (power, data)', 'Electrical and communications'], IFCSWITCHINGDEVICE: ['Switches', 'Electrical and communications'], IFCELECTRICDISTRIBUTIONBOARD: ['Distribution boards', 'Electrical and communications'], IFCELECTRICAPPLIANCE: ['Electrical appliances', 'Electrical and communications'], IFCPROTECTIVEDEVICE: ['Protective devices', 'Electrical and communications'], IFCJUNCTIONBOX: ['Junction boxes', 'Electrical and communications'], IFCCOMMUNICATIONSAPPLIANCE: ['Communications devices', 'Electrical and communications'], IFCALARM: ['Alarms', 'Electrical and communications'], IFCSENSOR: ['Sensors', 'Electrical and communications'],
    IFCFLOWSEGMENT: ['Pipes and ducts', 'Building services'], IFCFLOWFITTING: ['Pipe and duct fittings', 'Building services'], IFCFLOWTERMINAL: ['Terminals (fixtures, outlets, grilles)', 'Building services'], IFCFLOWCONTROLLER: ['Valves, dampers and switches', 'Building services'], IFCFLOWMOVINGDEVICE: ['Pumps and fans', 'Building services'], IFCFLOWSTORAGEDEVICE: ['Tanks', 'Building services'], IFCFLOWTREATMENTDEVICE: ['Filters and treatment', 'Building services'], IFCENERGYCONVERSIONDEVICE: ['Plant (AHUs, boilers, chillers)', 'Building services'], IFCDISTRIBUTIONCONTROLELEMENT: ['Controls', 'Building services'], IFCDISTRIBUTIONELEMENT: ['Services elements', 'Building services'], IFCDISTRIBUTIONFLOWELEMENT: ['Services elements', 'Building services'],
    IFCTRANSPORTELEMENT: ['Lifts and escalators', 'Lifts and transport'], IFCBUILDINGELEMENTPROXY: ['Other model elements (proxies)', 'Other elements'], IFCDISCRETEACCESSORY: ['Accessories', 'Other elements'], IFCMECHANICALFASTENER: ['Fasteners', 'Other elements'], IFCCHIMNEY: ['Chimneys', 'Envelope (roof, facade, windows)'], IFCSHADINGDEVICE: ['Shading devices', 'Envelope (roof, facade, windows)'], IFCGEOGRAPHICELEMENT: ['Site elements', 'Site works'], IFCCIVILELEMENT: ['Civil elements', 'Site works'], IFCELEMENTASSEMBLY: ['Assemblies', 'Other elements']
  };
  var TRADE_ORDER = ['Site works', 'Substructure (footings, piles)', 'Structure', 'Walls and partitions', 'Envelope (roof, facade, windows)', 'Stairs, ramps and railings', 'Doors, windows and openings', 'Mechanical (HVAC)', 'Hydraulic and fire services', 'Electrical and communications', 'Building services', 'Lifts and transport', 'Finishes', 'Fit-out and furniture', 'Other elements'];
  var NOT_ELEM = /^IFC(OPENINGELEMENT|OPENINGSTANDARDCASE|VIRTUALELEMENT|SPACE|SITE|BUILDING|BUILDINGSTOREY|ANNOTATION|GRID|PORT|DISTRIBUTIONPORT|FEATUREELEMENT.*|VOIDINGFEATURE|SURFACEFEATURE|PROJECTIONELEMENT)$/;
  var niceClass = function (c) { return CLASS[c] ? CLASS[c][0] : c.replace(/^IFC/, '').replace(/STANDARDCASE$/, '').toLowerCase().replace(/^./, function (x) { return x.toUpperCase(); }); };
  var tradeOf = function (c) { return CLASS[c] ? CLASS[c][1] : 'Other elements'; };
  var cleanName = function (s) { return String(s || '').replace(/:\d+$/, '').replace(/\s+/g, ' ').trim(); };

  function ifcReader() {
    var E = {}, header = { schema: '', system: '', author: '', date: '' }, buf = '', inData = false, n = 0, kept = 0;
    function rec(r) {
      r = r.trim(); if (!r) return;
      if (!inData) {
        if (/^DATA$/i.test(r)) { inData = true; return; }
        var m1 = /^FILE_SCHEMA\s*\(\s*\(\s*'([^']*)'/i.exec(r); if (m1) header.schema = m1[1];
        if (/^FILE_NAME\s*\(/i.test(r)) { try { var a = args(r.slice(r.indexOf('(') + 1, r.lastIndexOf(')')) + ')'); header.date = String(a[1] || '').slice(0, 10); header.author = [].concat(a[2] || []).filter(Boolean).join(', '); header.system = String(a[5] || a[4] || ''); } catch (e) {} }
        return;
      }
      if (r.charAt(0) !== '#') return;
      n++;
      var eq = r.indexOf('='), op = r.indexOf('(', eq); if (eq < 0 || op < 0) return;
      var id = +r.slice(1, eq), type = r.slice(eq + 1, op).trim().toUpperCase();
      if (SKIP.test(type)) return;
      if (type === 'IFCPROPERTYSINGLEVALUE' && !PROP_KEEP.test(r.slice(eq + 1).trim())) return;
      if (/^IFC(PROPERTYENUMERATEDVALUE|PROPERTYENUMERATION|PROPERTYLISTVALUE|PROPERTYBOUNDEDVALUE|PROPERTYREFERENCEVALUE|COMPLEXPROPERTY|CLASSIFICATIONREFERENCE|RELASSOCIATESCLASSIFICATION|RELCONNECTS.*|RELSPACEBOUNDARY.*|RELVOIDSELEMENT|RELFILLSELEMENT|RELASSIGNSTOGROUP|RELSERVICESBUILDINGS|RELNESTS|RELDEFINESBYTEMPLATE|PROPERTYSETTEMPLATE|SIMPLEPROPERTYTEMPLATE)$/.test(type)) return;
      E[id] = { t: type, s: r.slice(op + 1, r.lastIndexOf(')')) }; kept++;
    }
    return {
      push: function (chunk) {
        buf += chunk;
        var start = 0, re = /;[ \t]*\r?\n/g, m;
        while ((m = re.exec(buf))) { rec(buf.slice(start, m.index)); start = m.index + m[0].length; }
        buf = buf.slice(start);
        if (buf.length > 8e6) { rec(buf); buf = ''; }   // one record without line breaks: never hold more than this
      },
      end: function () { if (buf.trim()) rec(buf.replace(/;\s*$/, '')); buf = ''; return build(E, header, n); }
    };
  }
  function build(E, header, total) {
    var A = {}; var a = function (id) { var x = E[id]; if (!x) return null; if (!A[id]) { try { A[id] = args(x.s + ')'); } catch (e) { A[id] = []; } } return A[id]; };
    var ref = function (v) { return v && typeof v === 'object' && v.r ? v.r : null; };
    var refs = function (v) { return (Array.isArray(v) ? v : []).map(ref).filter(Boolean); };
    var num = function (v) { if (v && typeof v === 'object' && 't' in v) v = v.v; return typeof v === 'number' && isFinite(v) ? v : null; };
    var ids = Object.keys(E), byType = {};
    ids.forEach(function (id) { var t = E[id].t; (byType[t] = byType[t] || []).push(+id); });
    var all = function (t) { return byType[t] || []; };
    // 📏 units: quantities are in the project's units (millimetres and feet are common in Revit exports)
    var f = { L: 1, A: 1, V: 1, M: 1 }, unitNote = [];
    var pre = { MILLI: 1e-3, CENTI: 1e-2, DECI: 0.1, KILO: 1e3 };
    all('IFCSIUNIT').forEach(function (id) { var x = a(id), ut = x[1] && x[1].e, p = x[2] && x[2].e, k = p && pre[p] ? pre[p] : 1;
      if (ut === 'LENGTHUNIT') { f.L = k; if (k !== 1) unitNote.push('lengths converted from ' + p.toLowerCase() + 'metres'); }
      if (ut === 'AREAUNIT') f.A = k * k; if (ut === 'VOLUMEUNIT') f.V = k * k * k; if (ut === 'MASSUNIT') f.M = p === 'KILO' ? 1 : k / 1000; });
    all('IFCCONVERSIONBASEDUNIT').forEach(function (id) { var x = a(id), ut = x[1] && x[1].e, nm = String(x[2] || '').toUpperCase();
      if (ut === 'LENGTHUNIT' && /FOOT|FEET/.test(nm)) { f.L = 0.3048; unitNote.push('lengths converted from feet'); } if (ut === 'LENGTHUNIT' && /INCH/.test(nm)) { f.L = 0.0254; unitNote.push('lengths converted from inches'); }
      if (ut === 'AREAUNIT' && /FOOT|FEET/.test(nm)) { f.A = 0.09290304; unitNote.push('areas converted from square feet'); } if (ut === 'VOLUMEUNIT' && /FOOT|FEET/.test(nm)) { f.V = 0.0283168; unitNote.push('volumes converted from cubic feet'); }
      if (ut === 'MASSUNIT' && /POUND/.test(nm)) f.M = 0.453592; });
    // 🏢 the project, site, buildings and levels
    var proj = all('IFCPROJECT').map(a)[0] || [], site = all('IFCSITE').map(a)[0] || [];
    var addr = function (r) { var x = a(r); if (!x) return ''; return [].concat(x[4] || []).concat([x[6], x[7], x[8], x[9]]).filter(function (v) { return v && typeof v === 'string'; }).join(', '); };
    var siteAddr = site.length ? addr(ref(site[13])) : '', bld = all('IFCBUILDING').map(function (id) { var x = a(id); return { name: x[7] || x[2] || 'Building', addr: addr(ref(x[11])) }; });
    var storeys = all('IFCBUILDINGSTOREY').map(function (id) { var x = a(id); return { id: id, name: cleanName(x[2] || x[7] || 'Level'), elev: num(x[9]) != null ? num(x[9]) * f.L : null, n: 0, trades: {}, rooms: 0, roomArea: 0 }; })
      .sort(function (p, q) { return (p.elev == null ? 1e9 : p.elev) - (q.elev == null ? 1e9 : q.elev); });
    var stBy = {}; storeys.forEach(function (s) { stBy[s.id] = s; });
    // 🔗 elements on each level; their type; their quantities; their materials
    var elems = {}, where = {};
    all('IFCRELCONTAINEDINSPATIALSTRUCTURE').forEach(function (id) { var x = a(id), st = ref(x[5]); refs(x[4]).forEach(function (e) { where[e] = st; elems[e] = 1; }); });
    all('IFCRELAGGREGATES').forEach(function (id) { var x = a(id), parent = ref(x[4]); refs(x[5]).forEach(function (c) { if (E[c] && E[c].t === 'IFCSPACE') where[c] = parent; else if (elems[parent] || where[parent]) { if (!where[c]) where[c] = where[parent] || null; } }); });
    var typeOf = {}, typeId = {};
    all('IFCRELDEFINESBYTYPE').forEach(function (id) { var x = a(id), t = ref(x[5]), tx = a(t), nm = tx ? cleanName(tx[2]) : ''; refs(x[4]).forEach(function (e) { if (nm) typeOf[e] = nm; typeId[e] = t; }); });
    var Q = {}, flags = {};
    var addQ = function (e, name, val, kind) { if (val == null || !isFinite(val)) return; var o = Q[e] = Q[e] || {}; o[kind + ':' + name] = val; };
    var readQ = function (e, qs) { refs(qs).forEach(function (q) { var x = a(q); if (!x) return; var t = E[q].t, nm = String(x[0] || ''), v = num(x[3]);
      if (t === 'IFCQUANTITYAREA') addQ(e, nm, v, 'A'); else if (t === 'IFCQUANTITYVOLUME') addQ(e, nm, v, 'V'); else if (t === 'IFCQUANTITYLENGTH') addQ(e, nm, v, 'L'); else if (t === 'IFCQUANTITYWEIGHT') addQ(e, nm, v, 'W'); else if (t === 'IFCQUANTITYCOUNT') addQ(e, nm, v, 'C'); }); };
    var readP = function (e, ps) { refs(ps).forEach(function (p) { var x = a(p); if (!x || E[p].t !== 'IFCPROPERTYSINGLEVALUE') return; var nm = String(x[0] || ''), v = x[2], ty = v && v.t || '';
      if (/^(IsExternal|LoadBearing)$/i.test(nm)) { (flags[e] = flags[e] || {})[nm.toLowerCase()] = !!(v && v.v && v.v.e === 'T'); return; }
      var n = num(v); if (n == null) return;
      if (/AREA/.test(ty)) addQ(e, nm, n, 'A'); else if (/VOLUME/.test(ty)) addQ(e, nm, n, 'V'); else if (/LENGTH/.test(ty)) addQ(e, nm, n, 'L'); else if (/MASS|WEIGHT/.test(ty)) addQ(e, nm, n, 'W'); }); };
    all('IFCRELDEFINESBYPROPERTIES').forEach(function (id) { var x = a(id), d = ref(x[5]), dx = a(d); if (!dx) return; var t = E[d].t;
      refs(x[4]).forEach(function (e) { if (t === 'IFCELEMENTQUANTITY') readQ(e, dx[5]); else if (t === 'IFCPROPERTYSET') readP(e, dx[4]); }); });
    var mat = {};
    var matName = function (m, depth) { var x = a(m); if (!x || depth > 4) return []; var t = E[m].t;
      if (t === 'IFCMATERIAL') return [String(x[0] || '')];
      if (t === 'IFCMATERIALLAYERSETUSAGE' || t === 'IFCMATERIALPROFILESETUSAGE') return matName(ref(x[0]), depth + 1);
      if (t === 'IFCMATERIALLAYERSET') return refs(x[0]).reduce(function (o, l) { return o.concat(matName(l, depth + 1)); }, []);
      if (t === 'IFCMATERIALLAYER') return matName(ref(x[0]), depth + 1);
      if (t === 'IFCMATERIALLIST') return refs(x[0]).reduce(function (o, l) { return o.concat(matName(l, depth + 1)); }, []);
      if (t === 'IFCMATERIALCONSTITUENTSET' || t === 'IFCMATERIALPROFILESET') return refs(x[2]).reduce(function (o, l) { return o.concat(matName(l, depth + 1)); }, []);
      if (t === 'IFCMATERIALCONSTITUENT' || t === 'IFCMATERIALPROFILE') return matName(ref(x[2]), depth + 1);
      return []; };
    all('IFCRELASSOCIATESMATERIAL').forEach(function (id) { var x = a(id), names = matName(ref(x[5]), 0).filter(Boolean).filter(function (v, i, L) { return L.indexOf(v) === i; }); if (!names.length) return; refs(x[4]).forEach(function (e) { mat[e] = names; }); });
    var pick = function (o, kind, list) { if (!o) return null; for (var i = 0; i < list.length; i++) if ((kind + ':' + list[i]) in o) return o[kind + ':' + list[i]]; return null; };
    // 📋 group by class and type
    var G = {}, cls = {}, rooms = [], matT = {}, elN = 0, withQ = 0;
    Object.keys(where).concat(Object.keys(elems)).filter(function (v, i, L) { return L.indexOf(v) === i; }).forEach(function (k) {
      var e = +k, x = E[e]; if (!x) return; var t = x.t, ax = a(e), st = stBy[where[e]] || null;
      if (t === 'IFCSPACE') { var ar = pick(Q[e], 'A', ['NetFloorArea', 'GrossFloorArea', 'NetArea', 'GrossArea', 'Area']); rooms.push({ name: cleanName([ax[2], ax[7]].filter(Boolean).join(' ') || 'Room'), kind: cleanName(ax[7] || ax[3] || ax[2] || 'Room').replace(/\s*\d+$/, '') || 'Room', level: st ? st.name : '', area: ar == null ? null : ar * f.A }); if (st) { st.rooms++; st.roomArea += ar ? ar * f.A : 0; } return; }
      if (NOT_ELEM.test(t) || !/^IFC/.test(t)) return;
      elN++;
      var tn = typeOf[e] || cleanName(ax[4]) || cleanName(ax[2]) || niceClass(t), key = t + '|' + tn, ms = mat[e] || (typeId[e] && mat[typeId[e]]) || [];
      var ar2 = pick(Q[e], 'A', QA), vo = pick(Q[e], 'V', QV), le = pick(Q[e], 'L', QL), we = pick(Q[e], 'W', QW);
      if (ar2 != null || vo != null || le != null) withQ++;
      var g = G[key] = G[key] || { cls: t, type: tn, mats: {}, n: 0, area: 0, vol: 0, len: 0, wt: 0, levels: {}, ext: 0 };
      g.n++; if (ar2) g.area += ar2 * f.A; if (vo) g.vol += vo * f.V; if (le) g.len += le * f.L; if (we) g.wt += we * f.M;
      ms.forEach(function (m) { g.mats[m] = 1; var mt = matT[m] = matT[m] || { n: 0, vol: 0, area: 0 }; mt.n++; if (vo && ms.length === 1) mt.vol += vo * f.V; if (ar2) mt.area += ar2 * f.A; });   // a layered element: each layer covers the whole area; its volume is not split by layer
      if (flags[e] && flags[e].isexternal) g.ext++;
      if (st) { g.levels[st.name] = (g.levels[st.name] || 0) + 1; st.n++; var tr = tradeOf(t); st.trades[tr] = st.trades[tr] || {}; st.trades[tr][niceClass(t)] = (st.trades[tr][niceClass(t)] || 0) + 1; }
      var c = cls[t] = cls[t] || { n: 0, area: 0, vol: 0, len: 0 }; c.n++; if (ar2) c.area += ar2 * f.A; if (vo) c.vol += vo * f.V; if (le) c.len += le * f.L;
    });
    return { header: header, records: total, project: { name: proj[2] || '', longName: proj[5] || '', phase: proj[6] || '' }, site: { name: site[2] || '', longName: site[7] || '', address: siteAddr }, buildings: bld, storeys: storeys,
      groups: Object.keys(G).map(function (k) { var g = G[k]; g.mats = Object.keys(g.mats); return g; }), classes: cls, rooms: rooms, materials: matT, elements: elN, withQty: withQ, units: unitNote };
  }
  function ifcText(name, size, S) {
    var L = [], q = function (g) { return [g.area ? fmt(g.area) + ' m²' : '', g.vol ? fmt(g.vol, 2) + ' m³' : '', g.len ? fmt(g.len) + ' m' : '', g.wt ? fmt(g.wt) + ' kg' : ''].filter(Boolean).join(', '); };
    L.push('BIM MODEL (IFC): building elements, levels, work breakdown by level and trade, and the model quantity take-off');
    L.push('File: ' + name + ' (' + mb(size) + (S.header.schema ? ', ' + S.header.schema : '') + (S.header.system ? ', exported from ' + S.header.system : '') + (S.header.date ? ' on ' + S.header.date : '') + ').');
    if (S.project.name || S.project.longName) L.push('Project: ' + [S.project.name, S.project.longName].filter(Boolean).join(': ') + (S.project.phase ? ' (phase: ' + S.project.phase + ')' : '') + '.');
    if (S.site.name || S.site.longName || S.site.address) L.push('Site: ' + [S.site.longName || S.site.name, S.site.address].filter(Boolean).join(', ') + '.');
    if (S.buildings.length) L.push('Building' + (S.buildings.length > 1 ? 's' : '') + ': ' + S.buildings.map(function (b) { return b.name + (b.addr ? ' (' + b.addr + ')' : ''); }).join('; ') + '.');
    L.push('Model size: ' + fmt(S.elements, 0) + ' building elements in ' + S.groups.length + ' types, ' + S.storeys.length + ' levels' + (S.rooms.length ? ', ' + S.rooms.length + ' room' + (S.rooms.length === 1 ? '' : 's') + ' (spaces)' : '') + '. ' +
      (S.elements ? (S.withQty ? fmt(S.withQty / S.elements * 100, 0) + '% of the elements carry quantities' : 'The elements carry no quantities (export the IFC with base quantities for areas and volumes): counts only') : '') + (S.units.length ? '; ' + S.units.join(', ') : '') + '.');
    if (S.storeys.length) {
      L.push('\nLevels (storeys), lowest first:');
      S.storeys.forEach(function (s) { L.push('- ' + s.name + (s.elev != null ? ' (elevation ' + fmt(s.elev, 2) + ' m)' : '') + ': ' + fmt(s.n, 0) + ' elements' + (s.rooms ? ', ' + s.rooms + ' room' + (s.rooms === 1 ? '' : 's') + (s.roomArea ? ' (' + fmt(s.roomArea) + ' m²)' : '') : '')); });
    }
    // scope by trade, in construction order
    var byTrade = {};
    Object.keys(S.classes).forEach(function (c) { var tr = tradeOf(c); (byTrade[tr] = byTrade[tr] || []).push(c); });
    L.push('\nScope of work by trade (in construction order), from the model:');
    TRADE_ORDER.concat(Object.keys(byTrade).filter(function (t) { return TRADE_ORDER.indexOf(t) < 0; })).forEach(function (tr) {
      if (!byTrade[tr]) return;
      L.push('- ' + tr + ': ' + byTrade[tr].sort(function (p, x) { return S.classes[x].n - S.classes[p].n; }).map(function (c) { var g = S.classes[c], qq = q(g); return niceClass(c) + ' ' + fmt(g.n, 0) + (qq ? ' (' + qq + ')' : ''); }).join('; '));
    });
    if (S.storeys.length) {
      L.push('\nWork breakdown structure by level and trade (phases, tasks and activities follow the build sequence, level by level):');
      S.storeys.forEach(function (s) { var tr = Object.keys(s.trades).sort(function (p, x) { return TRADE_ORDER.indexOf(p) - TRADE_ORDER.indexOf(x); }); if (!tr.length) return;
        L.push('- ' + s.name + ': ' + tr.map(function (t) { var o = s.trades[t]; return t + ' (' + Object.keys(o).map(function (k) { return k.toLowerCase() + ' ' + o[k]; }).join(', ') + ')'; }).join('; ')); });
    }
    L.push('\nMODEL QUANTITY TAKE-OFF by type (for the BOM / BOQ; quantities measured from the model, before waste):');
    L.push('Class | Type | Material | Count | Area m² | Volume m³ | Length m | Weight kg | Levels');
    S.groups.slice().sort(function (p, x) { return TRADE_ORDER.indexOf(tradeOf(p.cls)) - TRADE_ORDER.indexOf(tradeOf(x.cls)) || x.n - p.n; }).slice(0, 220).forEach(function (g) {
      var lv = Object.keys(g.levels); L.push([niceClass(g.cls) + (g.ext ? ' (' + g.ext + ' external)' : ''), g.type, g.mats.slice(0, 3).join(' / ') || '-', fmt(g.n, 0), g.area ? fmt(g.area) : '-', g.vol ? fmt(g.vol, 2) : '-', g.len ? fmt(g.len) : '-', g.wt ? fmt(g.wt) : '-', lv.length > 4 ? lv.length + ' levels' : lv.join(', ') || '-'].join(' | '));
    });
    if (S.groups.length > 220) L.push('(' + (S.groups.length - 220) + ' smaller types not listed)');
    var M = Object.keys(S.materials).sort(function (p, x) { return S.materials[x].vol - S.materials[p].vol || S.materials[x].n - S.materials[p].n; });
    if (M.length) { L.push('\nMaterials in the model:'); M.slice(0, 60).forEach(function (m) { var o = S.materials[m]; L.push('- ' + m + ': ' + fmt(o.n, 0) + ' element' + (o.n === 1 ? '' : 's') + (o.vol ? ', ' + fmt(o.vol, 2) + ' m³' : '') + (o.area ? ', ' + fmt(o.area) + ' m²' : '')); }); }
    if (S.rooms.length) {
      L.push('\nRooms (spaces):');
      var RL = {}; S.rooms.forEach(function (r) { var k = r.kind || 'Room'; var o = RL[k] = RL[k] || { n: 0, area: 0 }; o.n++; o.area += r.area || 0; });
      Object.keys(RL).sort(function (p, x) { return RL[x].area - RL[p].area; }).slice(0, 60).forEach(function (k) { L.push('- ' + k + ': ' + RL[k].n + (RL[k].area ? ' (' + fmt(RL[k].area) + ' m² in all)' : '')); });
    }
    L.push('\nNote: the quantities are what the model holds; check them against the drawings and specifications before ordering, and add waste allowances.');
    return L.join('\n');
  }
  function readIfc(file, onProg) {
    var R = ifcReader(), size = file.size || 0;
    if (file.stream && typeof TextDecoder !== 'undefined') {
      var rd = file.stream().getReader(), dec = new TextDecoder('utf-8'), got = 0, lastP = -1;
      var step = function () { return rd.read().then(function (x) { if (x.done) { R.push(dec.decode()); return; } got += x.value.length; R.push(dec.decode(x.value, { stream: true }));
        var p = size ? Math.floor(got / size * 100) : 0; if (onProg && p !== lastP && p % 5 === 0) { lastP = p; onProg(p, 100); } return step(); }); };
      return step().then(function () { return R.end(); });
    }
    return file.text().then(function (t) { R.push(t + '\n'); return R.end(); });
  }

  /* ---------- schedules: Navisworks TimeLiner CSV and MS Project XML ---------- */
  function csvRows(t) {
    var rows = [], row = [], cell = '', q = false;
    for (var i = 0; i < t.length; i++) { var c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
      if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; } else cell += c; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (v) { return String(v).trim(); }); });
  }
  function dateOf(s) { s = String(s || '').trim(); var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/.exec(s); if (m) { var y = m[3].length === 2 ? '20' + m[3] : m[3]; return y + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[1]).slice(-2); }
    var d = Date.parse(s); return isNaN(d) ? s.slice(0, 20) : new Date(d).toISOString().slice(0, 10); }
  function timeliner(name, t) {
    var R = csvRows(t); if (R.length < 2) return null;
    var H = R[0].map(function (h) { return String(h).trim().toLowerCase(); }), col = function (re) { for (var i = 0; i < H.length; i++) if (re.test(H[i])) return i; return -1; };
    var ps = col(/^planned start/), pe = col(/^planned (end|finish)/); if (ps < 0 || pe < 0) return null;
    var nm = col(/^name$/), as = col(/^actual start/), ae = col(/^actual (end|finish)/), ty = col(/task type/), at = col(/attached/), st = col(/^status/);
    var L = ['CONSTRUCTION SCHEDULE: Navisworks TimeLiner export (4D programme: timeline schedule, tasks, milestones, dates and the model parts attached)', 'File: ' + name + '. ' + (R.length - 1) + ' tasks.'], first = '', last = '';
    R.slice(1).slice(0, 2500).forEach(function (r, i) { var a = dateOf(r[ps]), b = dateOf(r[pe]); if (a && (!first || a < first)) first = a; if (b && b > last) last = b;
      L.push('- ' + (String(r[nm >= 0 ? nm : 0] || 'Task ' + (i + 1)).trim()) + ': planned ' + a + ' to ' + b + (as >= 0 && r[as] ? '; actual ' + dateOf(r[as]) + (ae >= 0 && r[ae] ? ' to ' + dateOf(r[ae]) : '') : '') + (ty >= 0 && r[ty] ? '; ' + String(r[ty]).trim() : '') + (st >= 0 && r[st] ? '; status ' + String(r[st]).trim() : '') + (at >= 0 && r[at] ? '; model: ' + String(r[at]).trim().slice(0, 120) : '')); });
    L.splice(2, 0, 'Planned from ' + first + ' to ' + last + '.');
    return L.join('\n');
  }
  function msProject(name, doc) {
    var T = [].slice.call(doc.getElementsByTagName('Task')), g = function (el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : ''; };
    if (!T.length) return null;
    var title = g(doc.documentElement, 'Title') || g(doc.documentElement, 'Name'), uid = {};
    T.forEach(function (t) { uid[g(t, 'UID')] = g(t, 'Name'); });
    var L = ['CONSTRUCTION SCHEDULE: MS Project XML (timeline schedule, phases, tasks, milestones, dates, dependencies)' + (title ? ': ' + title : ''), 'File: ' + name + '. ' + T.length + ' tasks.'];
    T.slice(0, 2500).forEach(function (t) { var n = g(t, 'Name'); if (!n) return; var lv = Math.max(0, (+g(t, 'OutlineLevel') || 1) - 1), ms = g(t, 'Milestone') === '1', sm = g(t, 'Summary') === '1';
      var pr = [].slice.call(t.getElementsByTagName('PredecessorLink')).map(function (p) { return uid[g(p, 'PredecessorUID')]; }).filter(Boolean);
      var du = /PT(\d+)H/.exec(g(t, 'Duration')); L.push(new Array(lv + 1).join('  ') + '- ' + (sm ? 'Phase: ' : ms ? 'Milestone: ' : '') + n + ': ' + dateOf(g(t, 'Start')) + (ms ? '' : ' to ' + dateOf(g(t, 'Finish'))) + (du && !ms ? ' (' + fmt(+du[1] / 8, 1) + ' days)' : '') + (pr.length ? '; after ' + pr.slice(0, 4).join(', ') : '') + (g(t, 'PercentComplete') && g(t, 'PercentComplete') !== '0' ? '; ' + g(t, 'PercentComplete') + '% done' : '')); });
    return L.join('\n');
  }
  /* ---------- Navisworks Clash Detective report (XML) ---------- */
  function clashes(name, doc) {
    var tests = [].slice.call(doc.getElementsByTagName('clashtest')); if (!tests.length) return null;
    var g = function (el, tag) { var x = el.getElementsByTagName(tag)[0]; return x ? x.textContent.trim() : ''; };
    var L = ['COORDINATION CLASHES: Navisworks Clash Detective report. Each open clash is a design coordination issue (a risk to the schedule and cost) to resolve before the trades install.', 'File: ' + name + '.'], total = 0;
    tests.forEach(function (ct) {
      var R = [].slice.call(ct.getElementsByTagName('clashresult')), st = {}, lv = {};
      R.forEach(function (r) { var s = r.getAttribute('status') || g(r, 'resultstatus') || 'new'; st[s] = (st[s] || 0) + 1; var gl = g(r, 'gridlocation'); var k = gl.split(':').pop().trim() || 'unknown level'; lv[k] = (lv[k] || 0) + 1; });
      total += R.length;
      L.push('\nClash test "' + (ct.getAttribute('name') || 'Test') + '" (' + (ct.getAttribute('test_type') || 'hard') + (ct.getAttribute('tolerance') ? ', tolerance ' + ct.getAttribute('tolerance') : '') + '): ' + R.length + ' clashes; by status: ' + Object.keys(st).map(function (k) { return k + ' ' + st[k]; }).join(', ') + '; by level: ' + Object.keys(lv).map(function (k) { return k + ' ' + lv[k]; }).join(', ') + '.');
      R.filter(function (r) { return !/^(resolved|approved)$/i.test(r.getAttribute('status') || ''); }).slice(0, 150).forEach(function (r) {
        var obj = [].slice.call(r.getElementsByTagName('clashobject')).map(function (o) { var tags = {}; [].slice.call(o.getElementsByTagName('smarttag')).forEach(function (s) { tags[g(s, 'name')] = g(s, 'value'); });
          return [tags['Item Name'], tags['Item Type'], g(o, 'layer')].filter(Boolean).join(', ') || 'item'; });
        L.push('- ' + (r.getAttribute('name') || 'Clash') + ' (' + (r.getAttribute('status') || 'new') + (r.getAttribute('distance') ? ', ' + fmt(Math.abs(+r.getAttribute('distance')), 3) + ' overlap' : '') + ')' + (g(r, 'gridlocation') ? ' at ' + g(r, 'gridlocation') : '') + ': ' + obj.join(' vs ') + (g(r, 'description') ? '; ' + g(r, 'description') : ''));
      });
    });
    L.splice(2, 0, total + ' clashes in ' + tests.length + ' tests.');
    return L.join('\n');
  }
  /* ---------- DXF ---------- */
  function dxf(name, t) {
    var lines = t.split(/\r?\n/), layers = {}, blocks = {}, texts = [], ent = '';
    for (var i = 0; i + 1 < lines.length; i += 2) { var code = lines[i].trim(), v = lines[i + 1];
      if (code === '0') ent = v.trim(); else if (code === '8') layers[v.trim()] = (layers[v.trim()] || 0) + 1; else if (code === '2' && ent === 'INSERT') blocks[v.trim()] = (blocks[v.trim()] || 0) + 1;
      else if ((code === '1' || code === '3') && /^(TEXT|MTEXT|ATTRIB|ATTDEF)$/.test(ent)) { var s = v.replace(/\\P/g, ' ').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, '').trim(); if (s && texts.length < 4000) texts.push(s); } }
    var top = function (o, n) { return Object.keys(o).sort(function (p, q) { return o[q] - o[p]; }).slice(0, n).map(function (k) { return k + ' (' + o[k] + ')'; }).join(', '); };
    return ['DRAWING (DXF): layers, blocks and the text on the drawing (title block, notes, schedules)', 'File: ' + name + '.', 'Layers: ' + top(layers, 60), Object.keys(blocks).length ? 'Blocks used (symbols, counted): ' + top(blocks, 80) : '', '\nText on the drawing:', texts.filter(function (v, i, L) { return L.indexOf(v) === i; }).join('\n')].filter(Boolean).join('\n');
  }

  // 📄 read one file; null when it is not one of these (the caller reads it as an ordinary document)
  function read(file, onProg) {
    var nm = String(file.name || ''), low = nm.toLowerCase();
    if (/\.ifc$/.test(low)) return readIfc(file, onProg).then(function (S) {
      if (!S.elements && !S.storeys.length) throw new Error('No building elements found in “' + nm + '”. Check it is an IFC model (not an IFC-ZIP or XML) and export it again.');
      return { text: ifcText(nm, file.size, S), pages: 0, kind: 'ifc', summary: { elements: S.elements, types: S.groups.length, levels: S.storeys.length, rooms: S.rooms.length, withQty: S.withQty, schema: S.header.schema, system: S.header.system } }; });
    if (/\.dxf$/.test(low)) return file.text().then(function (t) { return { text: dxf(nm, t), pages: 0, kind: 'dxf' }; });
    if (/\.xml$/.test(low)) return file.text().then(function (t) {
      var doc = new DOMParser().parseFromString(t, 'application/xml'); if (doc.getElementsByTagName('parsererror').length) return null;
      var c = clashes(nm, doc); if (c) return { text: c, pages: 0, kind: 'clash' };
      var s = msProject(nm, doc); if (s) return { text: s, pages: 0, kind: 'schedule' };
      return null; });
    if (/\.csv$/.test(low)) return file.text().then(function (t) { var s = timeliner(nm, t); return s ? { text: s, pages: 0, kind: 'schedule' } : null; });
    return Promise.resolve(null);
  }
  var api = { read: read, keepOnly: function (name) { return KEEP.test(String(name || '')); }, canRead: function (name) { return READ.test(String(name || '')) || /\.csv$/i.test(String(name || '')); }, tip: tipFor,
    _ifc: function (name, text) { var R = ifcReader(); R.push(text + '\n'); var S = R.end(); return { S: S, text: ifcText(name, text.length, S) }; }, _timeliner: timeliner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.ChampBIM = api;
})(typeof window !== 'undefined' ? window : this);
