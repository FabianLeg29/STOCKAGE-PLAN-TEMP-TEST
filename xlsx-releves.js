// Générateur Excel des relevés de température (window.XlsxReleves), repris du prototype.
// Utilisé par releves.html et admin.html. Sans dépendance : produit un .xlsx (Uint8Array)
// avec les onglets Tableau (STOC E12.1), Graphiques, Données graphiques et Détail.
(function(root){
  'use strict';
  // --- ZIP (méthode « stockée ») ---
  var CRC = (function(){ var t = []; for (var n = 0; n < 256; n++){ var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(b){ var c = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files){
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    function u16(v){ return [v & 255, (v >>> 8) & 255]; } function u32(v){ return [v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255]; }
    files.forEach(function(f){
      var name = enc.encode(f.name), data = enc.encode(f.data), crc = crc32(data);
      var head = [].concat(u32(0x04034b50), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0));
      parts.push(new Uint8Array(head), name, data);
      central.push([].concat(u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0), u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length), u16(name.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(off)), name);
      off += head.length + name.length + data.length;
    });
    var cdSize = 0, cdParts = [];
    central.forEach(function(c, i){ if (i % 2 === 0){ var a = new Uint8Array(c); cdParts.push(a); cdSize += a.length; } else { cdParts.push(c); cdSize += c.length; } });
    var end = new Uint8Array([].concat(u32(0x06054b50), u16(0), u16(0), u16(files.length), u16(files.length), u32(cdSize), u32(off), u16(0)));
    var all = parts.concat(cdParts, [end]), len = all.reduce(function(a, p){ return a + p.length; }, 0), out = new Uint8Array(len), p = 0;
    all.forEach(function(a){ out.set(a, p); p += a.length; });
    return out;
  }
  // --- utilitaires ---
  function x(s){ return String(s == null ? '' : s).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
  function col(n){ var s = ''; n++; while (n > 0){ var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); } return s; }
  function cell(r, c, v, st){
    var ref = col(c) + (r + 1), s = st ? ' s="' + st + '"' : '';
    if (v === null || v === undefined || v === '') return st ? '<c r="' + ref + '"' + s + '/>' : '';
    if (typeof v === 'number' && isFinite(v)) return '<c r="' + ref + '"' + s + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
  }
  // rows : tableau de lignes ; chaque cellule = valeur ou {v, s}
  function sheet(rows, opts){
    opts = opts || {};
    var cols = opts.widths ? '<cols>' + opts.widths.map(function(w, i){ return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' : '';
    var data = rows.map(function(row, r){ return '<row r="' + (r + 1) + '">' + row.map(function(c, ci){ return c && typeof c === 'object' ? cell(r, ci, c.v, c.s) : cell(r, ci, c, 0); }).join('') + '</row>'; }).join('');
    var freeze = opts.freeze ? '<sheetViews><sheetView workbookViewId="0"><pane xSplit="' + (opts.freeze[0] || 0) + '" ySplit="' + opts.freeze[1] + '" topLeftCell="' + col(opts.freeze[0] || 0) + (opts.freeze[1] + 1) + '" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>' : '';
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      (opts.landscape ? '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' : '') + freeze + cols + '<sheetData>' + data + '</sheetData>' + (opts.merges && opts.merges.length ? '<mergeCells count="' + opts.merges.length + '">' + opts.merges.map(function(m){ return '<mergeCell ref="' + m + '"/>'; }).join('') + '</mergeCells>' : '') +
      '<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>' + (opts.landscape ? '<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' : '') + (opts.drawing ? '<drawing r:id="rId1"/>' : '') + '</worksheet>';
  }
  // styles : 0 normal, 1 gras, 2 nombre 0,0, 3 nombre 0,0 sur fond rouge (écart), 4 titre, 5 en-tête (gras, fond gris), 6 nombre entier, 7 texte rouge gras
  var STYLES = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<numFmts count="1"><numFmt numFmtId="164" formatCode="0.0"/></numFmts>' +
    '<fonts count="4"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font><font><b/><sz val="14"/><name val="Arial"/></font><font><b/><sz val="10"/><color rgb="FFB0302A"/><name val="Arial"/></font></fonts>' +
    '<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF8DFDB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE4EDEE"/><bgColor indexed="64"/></patternFill></fill></fills>' +
    '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC7D5D7"/></left><right style="thin"><color rgb="FFC7D5D7"/></right><top style="thin"><color rgb="FFC7D5D7"/></top><bottom style="thin"><color rgb="FFC7D5D7"/></bottom><diagonal/></border></borders>' +
    '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8">' +
    '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>' +
    '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="164" fontId="3" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>' +
    '<xf numFmtId="0" fontId="1" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>' +
    '<xf numFmtId="1" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>' +
    '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>' +
    '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  var COULEURS = ['1F5C63', '963E88', 'C0464A', '3E5C76', 'B88A1B', '4E6647', '6F8FB0', '8A5A44', '2B2620', 'D9772B', '5B2A66', '1F7444', '7E7468', 'A13B2F', '2E86AB'];
  function fmtNum(v){ return v == null ? '' : String(v); }
  function chartXml(titre, serie, nbLignes, feuille, colT, colMin, colMax, couleur, dates, vals, mins, maxs){
    var ref = function(c){ return "'" + feuille + "'!$" + col(c) + '$2:$' + col(c) + '$' + (nbLignes + 1); };
    var hdr = function(c){ return "'" + feuille + "'!$" + col(c) + '$1'; };
    var strCache = function(arr){ return '<c:strCache><c:ptCount val="' + arr.length + '"/>' + arr.map(function(v, i){ return '<c:pt idx="' + i + '"><c:v>' + x(v) + '</c:v></c:pt>'; }).join('') + '</c:strCache>'; };
    var numCache = function(arr){ return '<c:numCache><c:formatCode>0.0</c:formatCode><c:ptCount val="' + arr.length + '"/>' + arr.map(function(v, i){ return v == null ? '' : '<c:pt idx="' + i + '"><c:v>' + v + '</c:v></c:pt>'; }).join('') + '</c:numCache>'; };
    function ser(idx, c, nom, arr, ln, marker){
      return '<c:ser><c:idx val="' + idx + '"/><c:order val="' + idx + '"/><c:tx><c:strRef><c:f>' + hdr(c) + '</c:f>' + strCache([nom]) + '</c:strRef></c:tx>' +
        '<c:spPr>' + ln + '</c:spPr>' + marker +
        '<c:cat><c:strRef><c:f>' + ref(0) + '</c:f>' + strCache(dates) + '</c:strRef></c:cat>' +
        '<c:val><c:numRef><c:f>' + ref(c) + '</c:f>' + numCache(arr) + '</c:numRef></c:val><c:smooth val="0"/></c:ser>';
    }
    var series = ser(0, colT, serie, vals, '<a:ln w="28575" cap="rnd"><a:solidFill><a:srgbClr val="' + couleur + '"/></a:solidFill><a:round/></a:ln>', '<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="' + couleur + '"/></a:solidFill><a:ln><a:solidFill><a:srgbClr val="' + couleur + '"/></a:solidFill></a:ln></c:spPr></c:marker>');
    var k = 1;
    if (mins.some(function(v){ return v != null; })) series += ser(k++, colMin, 'Cible mini', mins, '<a:ln w="15875"><a:solidFill><a:srgbClr val="1F7444"/></a:solidFill><a:prstDash val="dash"/></a:ln>', '<c:marker><c:symbol val="none"/></c:marker>');
    if (maxs.some(function(v){ return v != null; })) series += ser(k++, colMax, 'Cible maxi', maxs, '<a:ln w="15875"><a:solidFill><a:srgbClr val="B0302A"/></a:solidFill><a:prstDash val="dash"/></a:ln>', '<c:marker><c:symbol val="none"/></c:marker>');
    var txt = function(sz, bold){ return '<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="' + sz + '"' + (bold ? ' b="1"' : '') + '/></a:pPr><a:endParaRPr lang="fr-FR"/></a:p></c:txPr>'; };
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
      '<c:lang val="fr-FR"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="fr-FR" sz="1200" b="1"/><a:t>' + x(titre) + '</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>' +
      '<c:plotArea><c:layout/><c:lineChart><c:grouping val="standard"/><c:varyColors val="0"/>' + series + '<c:marker val="1"/><c:axId val="50010"/><c:axId val="50020"/></c:lineChart>' +
      '<c:catAx><c:axId val="50010"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:numFmt formatCode="General" sourceLinked="1"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>' + txt(800) + '<c:crossAx val="50020"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx>' +
      '<c:valAx><c:axId val="50020"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="DDDDDD"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>' +
      '<c:title><c:tx><c:rich><a:bodyPr rot="-5400000" vert="horz"/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:r><a:rPr lang="fr-FR" sz="900"/><a:t>°C</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>' +
      '<c:numFmt formatCode="0.0" sourceLinked="0"/><c:majorTickMark val="out"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>' + txt(800) + '<c:crossAx val="50010"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>' +
      '</c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/>' + txt(800) + '</c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>';
  }

  /**
   * releves : liste des relevés (format de la collection « releves »)
   * chambres : liste des chambres {nom, min, max} (réglages actuels, pour l'ordre et les cibles)
   * options : { titre, periode, mois: 'AAAA-MM' (pour avoir tous les jours du mois) }
   * Retourne un Uint8Array (.xlsx)
   */
  function construire(releves, chambres, options){
    options = options || {};
    var jour = function(iso){ var d = new Date(iso); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
    var fr = function(j){ var p = j.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; };
    var hm = function(iso){ var d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
    var frigos = releves.filter(function(r){ return r.type === 'frigo'; }).slice().sort(function(a, b){ return a.at < b.at ? -1 : 1; });
    // ordre des chambres : réglages, puis chambres présentes seulement dans les données
    var noms = (chambres || []).map(function(c){ return c.nom; });
    frigos.forEach(function(r){ if (noms.indexOf(r.lieu) < 0) noms.push(r.lieu); });
    noms = noms.filter(function(n){ return frigos.some(function(r){ return r.lieu === n; }) || options.mois; });
    var cfg = function(n){ return (chambres || []).filter(function(c){ return c.nom === n; })[0] || {}; };
    // jours
    var jours = [];
    if (options.mois){ var y = +options.mois.slice(0, 4), m = +options.mois.slice(5, 7), nd = new Date(y, m, 0).getDate(); for (var d = 1; d <= nd; d++) jours.push(options.mois + '-' + String(d).padStart(2, '0')); }
    else { frigos.forEach(function(r){ var j = jour(r.at); if (jours.indexOf(j) < 0) jours.push(j); }); jours.sort(); }
    // dernier relevé par jour et par chambre
    var g = {}; frigos.forEach(function(r){ g[jour(r.at) + '|' + r.lieu] = r; });
    var tmin = function(r, n){ return r && r.min != null ? r.min : (cfg(n).min != null ? cfg(n).min : null); };
    var tmax = function(r, n){ return r && r.max != null ? r.max : (cfg(n).max != null ? cfg(n).max : null); };
    // statut : conforme / normal (hors cible avec motif) / ecart / arret ; anciens relevés sans statut : déduit de conforme
    var statut = function(r){ if (r.etat === 'arret') return 'arret'; if (r.statut === 'conforme' || r.statut === 'normal' || r.statut === 'ecart') return r.statut; return r.conforme === false ? 'ecart' : 'conforme'; };
    var LIB = { conforme: 'Conforme', normal: 'Hors cible – normal', ecart: 'Écart', arret: 'Arrêt' };
    var parId = {}; releves.forEach(function(r){ var id = r._id || r.id; if (id) parId[id] = r; });
    // tous les relevés frigo du jour par chambre (pour signaler un écart suivi d'une contre-mesure)
    var tous = {}; frigos.forEach(function(r){ var k = jour(r.at) + '|' + r.lieu; (tous[k] = tous[k] || []).push(r); });

    // Feuille 1 : tableau au format STOC E12.1
    var t1 = [[{ v: options.titre || 'RELEVÉ DE TEMPÉRATURE CHAMBRES FROIDES – STOC E12.1', s: 4 }], [{ v: 'La Légumière – ' + (options.periode || ''), s: 1 }], []];
    var h1 = [{ v: 'Date', s: 5 }], h2 = [{ v: 'Cible', s: 5 }];
    noms.forEach(function(n){ var c = cfg(n); h1.push({ v: n + ' T°C', s: 5 }, { v: n + ' Hygro %', s: 5 }, { v: n + ' Remarques', s: 5 });
      h2.push({ v: (c.min != null ? String(c.min).replace('.', ',') : '') + (c.min != null || c.max != null ? ' à ' : '') + (c.max != null ? String(c.max).replace('.', ',') + ' °C' : ''), s: 5 }, { v: '', s: 5 }, { v: '', s: 5 }); });
    t1.push(h1, h2);
    jours.forEach(function(j){ var row = [{ v: fr(j), s: 1 }];
      noms.forEach(function(n){ var r = g[j + '|' + n];
        if (!r){ row.push({ v: '', s: 2 }, { v: '', s: 6 }, { v: '', s: 2 }); return; }
        if (r.etat === 'arret'){ row.push({ v: 'X', s: 2 }, { v: 'X', s: 6 }, { v: 'ARRÊT' + (r.commentaire ? ' – ' + r.commentaire : ''), s: 2 }); return; }
        var st = statut(r);
        var avant = (tous[j + '|' + n] || []).filter(function(x){ return x !== r && statut(x) === 'ecart'; }).map(function(x){ return 'ÉCART ' + hm(x.at) + ' (' + String(x.temp).replace('.', ',') + ' °C) : ' + (x.action || ''); });
        var rem = [r.etat === 'vide' ? 'VIDE' : '', st === 'ecart' ? 'ÉCART : ' + (r.action || '') : '', st === 'normal' ? 'HORS CIBLE NORMAL : ' + (r.motif || '') : '', avant.length ? avant.join(' ; ') + ' – contre-mesure ' + hm(r.at) : '', r.commentaire || ''].filter(Boolean).join(' – ');
        row.push({ v: r.temp, s: st === 'ecart' ? 3 : 2 }, { v: r.hr == null ? '' : r.hr, s: 6 }, { v: rem, s: st === 'ecart' || avant.length ? 7 : 2 }); });
      t1.push(row); });
    var w1 = [12]; noms.forEach(function(){ w1.push(9, 8, 22); });

    // Feuille 3 : données des graphiques (Date, puis T°/mini/maxi par chambre)
    var D = 'Données graphiques', t3 = [['Date']];
    noms.forEach(function(n){ t3[0].push(n + ' T°C', n + ' cible mini', n + ' cible maxi'); });
    var series = noms.map(function(){ return { t: [], mi: [], ma: [] }; }), dates = jours.map(fr);
    jours.forEach(function(j, ji){ var row = [fr(j)];
      noms.forEach(function(n, ni){ var r = g[j + '|' + n], v = r && r.etat !== 'arret' && r.temp != null ? r.temp : null, a = tmin(r, n), b = tmax(r, n);
        row.push(v, a, b); series[ni].t.push(v); series[ni].mi.push(a); series[ni].ma.push(b); });
      t3.push(row); });

    // Feuille 2 : graphiques (un par chambre, deux par ligne)
    var anchors = '', charts = [], relsDrawing = '';
    noms.forEach(function(n, i){
      var c0 = (i % 2) * 9, r0 = 3 + Math.floor(i / 2) * 20;
      anchors += '<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>' + c0 + '</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>' + r0 + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>' + (c0 + 8) + '</xdr:col><xdr:colOff>400000</xdr:colOff><xdr:row>' + (r0 + 18) + '</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>' +
        '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="' + (i + 2) + '" name="Graphique ' + (i + 1) + '"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>' +
        '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId' + (i + 1) + '"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>';
      relsDrawing += '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart' + (i + 1) + '.xml"/>';
      var cfgN = cfg(n), titre = n + (cfgN.min != null || cfgN.max != null ? ' – cible ' + (cfgN.min != null ? String(cfgN.min).replace('.', ',') : '') + ' à ' + (cfgN.max != null ? String(cfgN.max).replace('.', ',') : '') + ' °C' : '');
      charts.push(chartXml(titre, 'Température (°C)', jours.length, D, 1 + i * 3, 2 + i * 3, 3 + i * 3, COULEURS[i % COULEURS.length], dates, series[i].t, series[i].mi, series[i].ma));
    });
    var t2 = [[{ v: 'Graphiques des températures par chambre – ' + (options.periode || ''), s: 4 }], [{ v: 'Trait plein : température relevée (dernier relevé du jour). Pointillés : cibles mini (vert) et maxi (rouge). Les jours sans relevé ou à l\'arrêt sont laissés vides.', s: 0 }]];

    // Feuille 4 : détail de tous les relevés (frigos et contrôles à cœur)
    var t4 = [[{ v: 'Date', s: 5 }, { v: 'Heure', s: 5 }, { v: 'Contrôle', s: 5 }, { v: 'Chambre / cellule', s: 5 }, { v: 'État', s: 5 }, { v: 'Produit', s: 5 }, { v: 'Lot', s: 5 }, { v: 'Température (°C)', s: 5 }, { v: 'Autres mesures', s: 5 }, { v: 'Cible mini', s: 5 }, { v: 'Cible maxi', s: 5 }, { v: 'Hygrométrie (%)', s: 5 }, { v: 'Résultat', s: 5 }, { v: 'Motif (hors cible normal)', s: 5 }, { v: 'Contre-mesure de', s: 5 }, { v: 'Opérateur', s: 5 }, { v: 'Action corrective', s: 5 }, { v: 'Remarques', s: 5 }, { v: 'Modifications', s: 5 }]];
    releves.slice().sort(function(a, b){ return a.at < b.at ? -1 : 1; }).forEach(function(r){
      var ts = r.temps && r.temps.length ? r.temps : (r.temp != null ? [r.temp] : []), st = statut(r), o = r.contreMesureDe ? parId[r.contreMesureDe] : null;
      t4.push([fr(jour(r.at)), hm(r.at), r.type === 'frigo' ? 'Frigo' : 'À cœur', r.lieu, r.type === 'frigo' ? ({ service: 'En service', vide: 'Vide', arret: 'À l\'arrêt' }[r.etat] || '') : '', r.produit || '', r.lot || '',
        { v: r.etat === 'arret' ? '' : r.temp, s: st === 'ecart' ? 3 : 2 }, ts.length > 1 ? ts.map(function(v){ return String(v).replace('.', ','); }).join(' / ') : '',
        { v: r.min, s: 2 }, { v: r.max, s: 2 }, { v: r.hr == null ? '' : r.hr, s: 6 }, st === 'ecart' ? { v: LIB.ecart, s: 7 } : LIB[st], r.motif || '', r.contreMesureDe ? (o ? 'Écart du ' + fr(jour(o.at)) + ' ' + hm(o.at) : 'Écart précédent') : '', r.operateur || '', r.action || '', r.commentaire || '',
        (r.modifications || []).map(function(m){ return fr(jour(m.le)) + ' ' + hm(m.le) + ' par ' + (m.par || '?') + ' : ' + (m.raison || ''); }).join(' ; ')]);
    });

    var sheets = [
      { name: 'Tableau', xml: sheet(t1, { widths: w1, freeze: [1, 5], landscape: true }) },
      { name: 'Graphiques', xml: sheet(t2, { widths: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10], drawing: noms.length > 0, landscape: true }) },
      { name: D, xml: sheet(t3, { widths: [12].concat(noms.map(function(){ return [10, 10, 10]; }).reduce(function(a, b){ return a.concat(b); }, [])), freeze: [1, 1] }) },
      { name: 'Détail', xml: sheet(t4, { widths: [11, 7, 9, 18, 11, 16, 12, 10, 14, 9, 9, 10, 18, 26, 20, 14, 30, 30, 40], freeze: [0, 1] }) }
    ];
    var files = [];
    var ct = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
      sheets.map(function(s, i){ return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') +
      (noms.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : '') +
      charts.map(function(c, i){ return '<Override PartName="/xl/charts/chart' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'; }).join('') +
      '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>';
    files.push({ name: '[Content_Types].xml', data: ct });
    files.push({ name: '_rels/.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>' });
    var now = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    files.push({ name: 'docProps/core.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>' + x(options.titre || 'Relevés de température') + '</dc:title><dc:creator>La Légumière – Relevés des températures</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">' + now + '</dcterms:created></cp:coreProperties>' });
    files.push({ name: 'docProps/app.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Microsoft Excel</Application></Properties>' });
    files.push({ name: 'xl/workbook.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>' + sheets.map(function(s, i){ return '<sheet name="' + x(s.name) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' });
    files.push({ name: 'xl/_rels/workbook.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + sheets.map(function(s, i){ return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (sheets.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' });
    files.push({ name: 'xl/styles.xml', data: STYLES });
    sheets.forEach(function(s, i){ files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', data: s.xml }); });
    if (noms.length){
      files.push({ name: 'xl/worksheets/_rels/sheet2.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>' });
      files.push({ name: 'xl/drawings/drawing1.xml', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' + anchors + '</xdr:wsDr>' });
      files.push({ name: 'xl/drawings/_rels/drawing1.xml.rels', data: '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + relsDrawing + '</Relationships>' });
      charts.forEach(function(c, i){ files.push({ name: 'xl/charts/chart' + (i + 1) + '.xml', data: c }); });
    }
    return zip(files);
  }
  root.XlsxReleves = { construire: construire };
})(typeof window !== 'undefined' ? window : globalThis);
