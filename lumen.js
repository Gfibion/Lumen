/**
 * ============================================================
 *  LUMEN v0.1 — Foundation
 *  A unified declarative language for user interfaces
 *
 *  Pipeline: Source → Tokens → AST → CSS + HTML → DOM
 *
 *  Sections:
 *    1. Tokenizer   — breaks source text into tokens
 *    2. Parser      — builds an AST from tokens
 *    3. Compiler    — converts AST to CSS + HTML strings
 *    4. Runtime     — discovers scripts and mounts output
 *
 *  Usage (HTML):
 *    <script src="lumen.js"></script>
 *    <script type="text/lumen">
 *      surface card {
 *        width: 300px
 *        height: 200px
 *        material: solid(#1a1a2e)
 *      }
 *    </script>
 *
 *  © Gfibion @SPENCER WRITERS
 * ============================================================
 */

(function (global) {
  'use strict';

  var LUMEN_VERSION = '0.1.0';


  // ============================================================
  // SECTION 1: TOKENIZER
  // Reads raw LUMEN source text character by character and
  // produces a flat list of typed tokens for the parser.
  //
  // Token types:
  //   KEYWORD    — reserved words: surface, material, text
  //   IDENT      — user-defined names: card, dark-panel, hero
  //   STRING     — quoted content: "Hello World"
  //   COLON      — property separator :
  //   LBRACE     — block open {
  //   RBRACE     — block close }
  //   VALUE      — everything after : until end of line
  //   NEWLINE    — line break (used to terminate values)
  //   EOF        — signals end of token stream
  // ============================================================

  var TT = {
    KEYWORD : 'KEYWORD',
    IDENT   : 'IDENT',
    STRING  : 'STRING',
    COLON   : 'COLON',
    LBRACE  : 'LBRACE',
    RBRACE  : 'RBRACE',
    VALUE   : 'VALUE',
    NEWLINE : 'NEWLINE',
    EOF     : 'EOF',
  };

  // Reserved words the tokenizer recognizes as KEYWORD tokens.
  // Everything else that looks like a word becomes an IDENT.
  var KEYWORDS = { surface: true, material: true, text: true };

  /**
   * tokenize(src: string) → Token[]
   *
   * The tokenizer has one special mode: after reading a COLON it
   * immediately collects the rest of the current line as a single
   * VALUE token. This lets property values contain spaces, commas,
   * parentheses, and special characters without needing quoting.
   *
   * Example:
   *   "shadow: 0 4px 20px rgba(0,0,0,0.5)"
   *   → IDENT("shadow"), COLON, VALUE("0 4px 20px rgba(0,0,0,0.5)")
   */
  function tokenize(src) {
    var tokens = [];
    var i = 0;
    var len = src.length;
    var afterColon = false; // flag: collect rest-of-line as VALUE

    while (i < len) {
      var ch = src[i];

      // ── Newline ──────────────────────────────────────────────
      if (ch === '\n' || ch === '\r') {
        afterColon = false;          // reset value-collection mode
        tokens.push({ type: TT.NEWLINE });
        i++;
        continue;
      }

      // ── If we just read a COLON, collect rest of line as VALUE ─
      if (afterColon) {
        // skip leading spaces/tabs on the same line
        while (i < len && (src[i] === ' ' || src[i] === '\t')) i++;

        var valStart = i;
        // read until newline or single-line comment
        while (i < len && src[i] !== '\n' && src[i] !== '\r') {
          if (src[i] === '/' && src[i + 1] === '/') break;
          i++;
        }
        var val = src.slice(valStart, i).trimRight();
        if (val.length > 0) {
          tokens.push({ type: TT.VALUE, value: val });
        }
        afterColon = false;
        continue;
      }

      // ── Whitespace (spaces / tabs) ────────────────────────────
      if (ch === ' ' || ch === '\t') { i++; continue; }

      // ── Single-line comment // ────────────────────────────────
      if (ch === '/' && src[i + 1] === '/') {
        while (i < len && src[i] !== '\n') i++;
        continue;
      }

      // ── Multi-line comment /* ... */ ─────────────────────────
      if (ch === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < len && !(src[i] === '*' && src[i + 1] === '/')) i++;
        i += 2;
        continue;
      }

      // ── Braces ────────────────────────────────────────────────
      if (ch === '{') { tokens.push({ type: TT.LBRACE });  i++; continue; }
      if (ch === '}') { tokens.push({ type: TT.RBRACE });  i++; continue; }

      // ── Colon ─────────────────────────────────────────────────
      if (ch === ':') {
        tokens.push({ type: TT.COLON });
        i++;
        afterColon = true;  // next iteration collects VALUE
        continue;
      }

      // ── String literal "..." ──────────────────────────────────
      if (ch === '"') {
        i++;  // skip opening quote
        var strStart = i;
        while (i < len && src[i] !== '"') i++;
        tokens.push({ type: TT.STRING, value: src.slice(strStart, i) });
        i++;  // skip closing quote
        continue;
      }

      // ── Identifier or Keyword ─────────────────────────────────
      // Identifiers may contain letters, digits, underscores, hyphens.
      // A leading letter or underscore is required.
      if (/[a-zA-Z_]/.test(ch)) {
        var wordStart = i;
        while (i < len && /[a-zA-Z0-9_-]/.test(src[i])) i++;
        var word = src.slice(wordStart, i);
        if (KEYWORDS[word]) {
          tokens.push({ type: TT.KEYWORD, value: word });
        } else {
          tokens.push({ type: TT.IDENT, value: word });
        }
        continue;
      }

      // ── Unknown character — skip silently ────────────────────
      i++;
    }

    tokens.push({ type: TT.EOF });
    return tokens;
  }


  // ============================================================
  // SECTION 2: PARSER
  // Walks the token list and builds a typed AST.
  //
  // Grammar (simplified):
  //
  //   program      → statement*
  //   statement    → surface_def | material_def
  //   surface_def  → 'surface' IDENT '{' surface_body '}'
  //   surface_body → (property | surface_def | text_def)*
  //   material_def → 'material' IDENT '{' property* '}'
  //   text_def     → 'text' STRING ('{' property* '}')?
  //   property     → IDENT ':' VALUE
  //
  // AST node shapes:
  //   { type:'Program',   body: [...] }
  //   { type:'Surface',   name, properties:[], children:[] }
  //   { type:'Material',  name, properties:[] }
  //   { type:'Text',      content, properties:[] }
  //   { type:'Property',  key, value }
  // ============================================================

  function parse(tokens) {
    var pos = 0;

    function peek()    { return tokens[pos]; }
    function advance() { return tokens[pos++]; }

    function expect(type) {
      var tok = advance();
      if (tok.type !== type) {
        throw new LumenError(
          'Parse Error: Expected ' + type + ' but got ' + tok.type +
          (tok.value ? ' ("' + tok.value + '")' : '')
        );
      }
      return tok;
    }

    // Discard any NEWLINE tokens
    function skipNewlines() {
      while (peek().type === TT.NEWLINE) advance();
    }

    // ── Program ───────────────────────────────────────────────
    function parseProgram() {
      var body = [];
      skipNewlines();
      while (peek().type !== TT.EOF) {
        var node = parseStatement();
        if (node) body.push(node);
        skipNewlines();
      }
      return { type: 'Program', body: body };
    }

    // ── Statement ─────────────────────────────────────────────
    function parseStatement() {
      var tok = peek();
      if (tok.type === TT.KEYWORD) {
        if (tok.value === 'surface')  return parseSurface();
        if (tok.value === 'material') return parseMaterial();
      }
      advance(); // skip anything unexpected at top level
      return null;
    }

    // ── Surface ───────────────────────────────────────────────
    function parseSurface() {
      expect(TT.KEYWORD);              // consume 'surface'
      var name = expect(TT.IDENT).value;
      skipNewlines();
      expect(TT.LBRACE);
      skipNewlines();

      var properties = [];
      var children   = [];

      while (peek().type !== TT.RBRACE && peek().type !== TT.EOF) {
        skipNewlines();
        if (peek().type === TT.RBRACE) break;

        var cur = peek();

        if (cur.type === TT.KEYWORD && cur.value === 'surface') {
          children.push(parseSurface());
          skipNewlines();
          continue;
        }

        if (cur.type === TT.KEYWORD && cur.value === 'text') {
          children.push(parseText());
          skipNewlines();
          continue;
        }

        if (cur.type === TT.IDENT) {
          var prop = parseProperty();
          if (prop) properties.push(prop);
          skipNewlines();
          continue;
        }

        advance(); // skip unrecognised token
      }

      expect(TT.RBRACE);
      return { type: 'Surface', name: name, properties: properties, children: children };
    }

    // ── Material ──────────────────────────────────────────────
    function parseMaterial() {
      expect(TT.KEYWORD);              // consume 'material'
      var name = expect(TT.IDENT).value;
      skipNewlines();
      expect(TT.LBRACE);
      skipNewlines();

      var properties = [];
      while (peek().type !== TT.RBRACE && peek().type !== TT.EOF) {
        skipNewlines();
        if (peek().type === TT.RBRACE) break;
        if (peek().type === TT.IDENT) {
          var prop = parseProperty();
          if (prop) properties.push(prop);
        } else {
          advance();
        }
        skipNewlines();
      }

      expect(TT.RBRACE);
      return { type: 'Material', name: name, properties: properties };
    }

    // ── Text ──────────────────────────────────────────────────
    function parseText() {
      expect(TT.KEYWORD);              // consume 'text'
      var content = expect(TT.STRING).value;
      var properties = [];

      skipNewlines();
      if (peek().type === TT.LBRACE) {
        advance(); // consume {
        skipNewlines();
        while (peek().type !== TT.RBRACE && peek().type !== TT.EOF) {
          skipNewlines();
          if (peek().type === TT.RBRACE) break;
          if (peek().type === TT.IDENT) {
            var prop = parseProperty();
            if (prop) properties.push(prop);
          } else {
            advance();
          }
          skipNewlines();
        }
        expect(TT.RBRACE);
      }

      return { type: 'Text', content: content, properties: properties };
    }

    // ── Property ──────────────────────────────────────────────
    function parseProperty() {
      var key = advance().value;       // IDENT
      skipNewlines();

      if (peek().type !== TT.COLON) return null;
      advance(); // consume COLON

      var value = '';
      if (peek().type === TT.VALUE) {
        value = advance().value;
      } else if (peek().type === TT.STRING) {
        value = '"' + advance().value + '"';
      }

      return { type: 'Property', key: key, value: value.trim() };
    }

    return parseProgram();
  }


  // ============================================================
  // SECTION 3: COMPILER
  // Walks the AST and produces { css, html } strings.
  //
  // Each surface becomes a <div> with a unique generated ID.
  // Each material becomes a set of CSS declarations.
  // Text nodes become <p> elements.
  //
  // Compilation is a two-pass process:
  //   Pass 1 — collect all named Material nodes into a map
  //   Pass 2 — compile Surface nodes top-to-bottom,
  //             resolving material references as encountered
  // ============================================================

  var _idCounter = 0;
  function genId() { return 'lm' + (++_idCounter); }

  // ── Value helpers ─────────────────────────────────────────

  /**
   * parseFn("solid(#fff, 0.5)")
   * → { name: "solid", args: ["#fff", "0.5"] }
   */
  function parseFn(value) {
    var m = value.match(/^([\w-]+)\((.+)\)$/);
    if (!m) return null;
    // split args on commas that are NOT inside parentheses
    var args = [];
    var depth = 0;
    var current = '';
    for (var i = 0; i < m[2].length; i++) {
      var c = m[2][i];
      if (c === '(') { depth++; current += c; }
      else if (c === ')') { depth--; current += c; }
      else if (c === ',' && depth === 0) {
        args.push(current.trim());
        current = '';
      } else {
        current += c;
      }
    }
    if (current.trim()) args.push(current.trim());
    return { name: m[1], args: args };
  }

  /** Convert #hex color to rgba() string */
  function hexToRgba(hex, alpha) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(function(c){ return c+c; }).join('');
    var r = parseInt(hex.slice(0, 2), 16);
    var g = parseInt(hex.slice(2, 4), 16);
    var b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + alpha + ')';
  }

  // ── Material resolution ───────────────────────────────────

  /**
   * Resolve a material expression (inline or named) to a CSS object.
   * Supported material functions:
   *
   *   solid(#color)
   *   gradient(#from, #to)
   *   gradient(angle, #from, #to)
   *   radial(#center, #edge)
   *   glass(#color, opacity)
   *   noise(#color)
   */
  function resolveMaterialValue(value) {
    var fn = parseFn(value);

    if (!fn) {
      // Plain color value passed directly
      return { 'background': value };
    }

    switch (fn.name) {

      case 'solid':
        return { 'background': fn.args[0] };

      case 'gradient': {
        // gradient(#from, #to)  or  gradient(angle, #from, #to)
        var direction = '135deg';
        var colors;
        if (fn.args.length === 2) {
          colors = fn.args;
        } else {
          direction = fn.args[0];
          colors = fn.args.slice(1);
        }
        return { 'background': 'linear-gradient(' + direction + ', ' + colors.join(', ') + ')' };
      }

      case 'radial':
        return { 'background': 'radial-gradient(circle, ' + fn.args.join(', ') + ')' };

      case 'glass': {
        var gColor   = fn.args[0] || '#ffffff';
        var gOpacity = parseFloat(fn.args[1] || '0.1');
        var bgColor  = gColor.charAt(0) === '#'
          ? hexToRgba(gColor, gOpacity)
          : gColor;
        return {
          'background'                  : bgColor,
          'backdrop-filter'             : 'blur(12px)',
          '-webkit-backdrop-filter'     : 'blur(12px)',
        };
      }

      case 'noise': {
        var nColor = fn.args[0] || '#1a1a2e';
        return {
          'background': nColor,
          'background-image': "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        };
      }

      default:
        return { 'background': value };
    }
  }

  // ── Property resolution ───────────────────────────────────

  /**
   * Resolve a single LUMEN surface property to a CSS object.
   * Returns a plain object of { cssProperty: cssValue } pairs.
   */
  function resolveSurfaceProp(key, value, materialMap) {
    switch (key) {

      // ── Dimensions ──────────────────────────────────────────
      case 'width':
        return value === 'fill'
          ? { 'flex': '1', 'min-width': '0' }
          : { 'width': value };

      case 'height':
        return value === 'fill'
          ? { 'flex': '1', 'min-height': '0' }
          : { 'height': value };

      case 'min-width':  return { 'min-width': value };
      case 'max-width':  return { 'max-width': value };
      case 'min-height': return { 'min-height': value };
      case 'max-height': return { 'max-height': value };

      // ── Material (inline or named reference) ─────────────────
      case 'material': {
        if (materialMap[value]) {
          return resolveMaterialNode(materialMap[value], materialMap);
        }
        return resolveMaterialValue(value);
      }

      // ── Use (apply a named material) ─────────────────────────
      case 'use': {
        if (materialMap[value]) {
          return resolveMaterialNode(materialMap[value], materialMap);
        }
        return {};
      }

      // ── Layout ───────────────────────────────────────────────
      case 'layout': {
        var parts = value.split(/\s+/);
        var dir = parts[0] === 'row' ? 'row' : 'column';
        return { 'display': 'flex', 'flex-direction': dir };
      }

      case 'gap':     return { 'gap': value };
      case 'wrap':    return { 'flex-wrap': value === 'true' ? 'wrap' : 'nowrap' };

      case 'align': {
        var aMap = { start: 'flex-start', end: 'flex-end' };
        return { 'align-items': aMap[value] || value };
      }

      case 'justify': {
        var jMap = {
          start   : 'flex-start',
          end     : 'flex-end',
          between : 'space-between',
          around  : 'space-around',
          evenly  : 'space-evenly',
        };
        return { 'justify-content': jMap[value] || value };
      }

      // ── Visual ────────────────────────────────────────────────
      case 'radius':   return { 'border-radius': value };
      case 'opacity':  return { 'opacity': value };
      case 'border':   return { 'border': value };
      case 'shadow':   return { 'box-shadow': value };
      case 'layer':    return { 'z-index': value };
      case 'overflow': return { 'overflow': value };
      case 'cursor':   return { 'cursor': value };

      // ── Spacing ───────────────────────────────────────────────
      case 'padding':  return { 'padding': value };
      case 'margin':   return { 'margin': value };

      // ── Transition / Animation ────────────────────────────────
      case 'transition': return { 'transition': value };

      // ── Pass-through for anything else ────────────────────────
      default: return { [key]: value };
    }
  }

  /**
   * Resolve a named Material node into CSS declarations.
   * Material-level 'color' property means fill/background.
   */
  function resolveMaterialNode(node, materialMap) {
    var css = {};
    node.properties.forEach(function (prop) {
      var resolved;
      // 'color' inside a material definition means background color
      if (prop.key === 'color') {
        resolved = { 'background': prop.value };
      } else {
        resolved = resolveSurfaceProp(prop.key, prop.value, materialMap);
      }
      Object.assign(css, resolved);
    });
    return css;
  }

  /**
   * Resolve a single LUMEN text property to a CSS object.
   */
  function resolveTextProp(key, value) {
    switch (key) {
      case 'font':       return { 'font-family': value };
      case 'size':       return { 'font-size': value };
      case 'color':      return { 'color': value };
      case 'weight':     return { 'font-weight': value };
      case 'align':      return { 'text-align': value };
      case 'spacing':    return { 'letter-spacing': value };
      case 'height':     return { 'line-height': value };
      case 'style':      return { 'font-style': value };
      case 'transform':  return { 'text-transform': value };
      case 'decoration': return { 'text-decoration': value };
      case 'wrap':       return { 'white-space': value === 'false' ? 'nowrap' : 'normal' };
      case 'padding':    return { 'padding': value };
      default:           return { [key]: value };
    }
  }

  // ── CSS serialisation ─────────────────────────────────────

  function cssObjectToString(obj) {
    return Object.entries(obj)
      .map(function (kv) { return kv[0] + ': ' + kv[1]; })
      .join('; ');
  }

  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Surface compilation ────────────────────────────────────

  function compileSurface(node, materialMap) {
    var id = genId();

    // Every surface starts with sensible defaults
    var css = {
      'box-sizing': 'border-box',
      'position'  : 'relative',
    };

    // Apply declared properties
    node.properties.forEach(function (prop) {
      Object.assign(css, resolveSurfaceProp(prop.key, prop.value, materialMap));
    });

    // Recursively compile children
    var childCSSBlocks = [];
    var childHTML      = [];

    node.children.forEach(function (child) {
      if (child.type === 'Surface') {
        var r = compileSurface(child, materialMap);
        childCSSBlocks.push(r.css);
        childHTML.push(r.html);
      } else if (child.type === 'Text') {
        var r2 = compileText(child);
        childCSSBlocks.push(r2.css);
        childHTML.push(r2.html);
      }
    });

    var cssBlock = '#' + id + ' { ' + cssObjectToString(css) + ' }';
    var allCSS   = [cssBlock].concat(childCSSBlocks).join('\n');
    var html     = '<div id="' + id + '" class="lumen-surface" data-name="' + escapeHTML(node.name) + '">'
                 + childHTML.join('\n')
                 + '</div>';

    return { id: id, css: allCSS, html: html };
  }

  // ── Text compilation ───────────────────────────────────────

  function compileText(node) {
    var id = genId();
    var css = { 'box-sizing': 'border-box', 'margin': '0' };

    node.properties.forEach(function (prop) {
      Object.assign(css, resolveTextProp(prop.key, prop.value));
    });

    var cssBlock = '#' + id + ' { ' + cssObjectToString(css) + ' }';
    var html     = '<p id="' + id + '" class="lumen-text">' + escapeHTML(node.content) + '</p>';

    return { id: id, css: cssBlock, html: html };
  }

  // ── Main compile entry ─────────────────────────────────────

  /**
   * compile(ast) → { css: string, html: string }
   *
   * Pass 1: collect all Material nodes into materialMap
   * Pass 2: compile Surface nodes, resolving material references
   */
  function compile(ast) {
    // Pass 1 — build material lookup table
    var materialMap = {};
    ast.body.forEach(function (node) {
      if (node && node.type === 'Material') {
        materialMap[node.name] = node;
      }
    });

    // Pass 2 — compile surfaces
    var cssBlocks = [];
    var htmlBlocks = [];

    ast.body.forEach(function (node) {
      if (!node) return;
      if (node.type === 'Surface') {
        var result = compileSurface(node, materialMap);
        cssBlocks.push(result.css);
        htmlBlocks.push(result.html);
      }
    });

    return {
      css  : cssBlocks.join('\n'),
      html : htmlBlocks.join('\n'),
    };
  }


  // ============================================================
  // SECTION 4: RUNTIME
  // Discovers <script type="text/lumen"> tags, runs each one
  // through the pipeline, and mounts the output into the DOM.
  //
  // Mount priority:
  //   1. The element whose id matches the script's [target] attr
  //   2. The element with id="lumen-root"
  //   3. A generated <div> inserted after the script tag itself
  // ============================================================

  /** Inject or append CSS into the shared <style id="lumen-styles"> tag */
  function injectCSS(css) {
    var el = document.getElementById('lumen-styles');
    if (!el) {
      el = document.createElement('style');
      el.id = 'lumen-styles';
      document.head.appendChild(el);
    }
    el.textContent += '\n' + css;
  }

  /** Find or create a mount container and insert HTML */
  function mountHTML(html, targetId, scriptEl) {
    var container = null;

    if (targetId) {
      container = document.getElementById(targetId);
    }

    if (!container) {
      container = document.getElementById('lumen-root');
    }

    if (!container) {
      container = document.createElement('div');
      container.className = 'lumen-mount';
      scriptEl.parentNode.insertBefore(container, scriptEl.nextSibling);
    }

    container.insertAdjacentHTML('beforeend', html);
  }

  /** Process a single <script type="text/lumen"> element */
  function processScript(scriptEl) {
    var source   = scriptEl.textContent || scriptEl.innerHTML;
    var targetId = scriptEl.getAttribute('target');

    try {
      var tokens = tokenize(source);
      var ast    = parse(tokens);
      var output = compile(ast);

      injectCSS(output.css);
      mountHTML(output.html, targetId, scriptEl);

    } catch (err) {
      var msg = err instanceof LumenError ? err.message : 'Internal Error: ' + err.message;
      console.error('[LUMEN]', msg);
      console.groupCollapsed('[LUMEN] Source that caused the error');
      console.log(source);
      console.groupEnd();
    }
  }

  /** Find all LUMEN script tags and process them in order */
  function init() {
    var scripts = document.querySelectorAll('script[type="text/lumen"]');
    scripts.forEach(processScript);
  }


  // ============================================================
  // LUMEN ERROR CLASS
  // Typed error so we can distinguish LUMEN compile errors
  // from unexpected JavaScript exceptions in catch blocks.
  // ============================================================

  function LumenError(message) {
    this.name    = 'LumenError';
    this.message = message;
  }
  LumenError.prototype = Object.create(Error.prototype);


  // ============================================================
  // AUTO-INIT
  // Runs init() as soon as the DOM is ready.
  // ============================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    // DOM already ready (script loaded with defer or at bottom of body)
    init();
  }


  // ============================================================
  // PUBLIC API
  // Exposed on window.LUMEN for external tooling and React
  // integration packages.
  // ============================================================

  global.LUMEN = {
    version  : LUMEN_VERSION,
    tokenize : tokenize,
    parse    : parse,
    compile  : compile,
    init     : init,
  };

})(typeof window !== 'undefined' ? window : this);
