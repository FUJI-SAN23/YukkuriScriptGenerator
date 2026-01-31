function doPost(e) {
  try {
    validateRequest_(e);
    var payload = parseJson_(e);

    var theme = (payload.theme || "").toString();
    theme = theme.substring(0, 20);

    var tsv = (payload.script_tsv || "").toString();
    var parsed = parseTsv_(tsv);

    var ss = SpreadsheetApp.openById(getScriptProperty_("SPREADSHEET_ID"));
    var sheetName = buildNextSheetName_(ss, theme);
    var sheet = ss.insertSheet(sheetName);

    writeSheet_(sheet, parsed.rows);

    return jsonResponse_({
      ok: true,
      sheet_name: sheetName,
      rows_written: parsed.rows.length,
      rows_skipped: parsed.rows_skipped
    });
  } catch (err) {
    return jsonResponse_({
      ok: false,
      error: err && err.message ? err.message : String(err),
      rows_skipped: 0
    });
  }
}

function validateRequest_(e) {
  if (!e || !e.postData || !e.postData.contents) {
    throw new Error("Empty request body");
  }

  var expectedToken = getScriptProperty_("TOKEN");
  var actualToken = getTokenFromRequest_(e);
  if (!actualToken || actualToken !== expectedToken) {
    throw new Error("Unauthorized");
  }
}

function parseJson_(e) {
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    throw new Error("Invalid JSON payload");
  }
}

function parseTsv_(tsv) {
  var rows = [];
  var rowsSkipped = 0;
  var lines = tsv.split(/\r?\n/);

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (!line || !line.trim()) {
      rowsSkipped++;
      continue;
    }

    var parts = line.split("\t");
    if (parts.length < 2) {
      rowsSkipped++;
      continue;
    }

    var speaker = parts[0].trim();
    var speech = parts.slice(1).join("\t").trim();

    if (!speaker || !speech) {
      rowsSkipped++;
      continue;
    }

    rows.push([rows.length + 1, speaker, speech]);
  }

  return { rows: rows, rows_skipped: rowsSkipped };
}

function writeSheet_(sheet, rows) {
  var header = [["行番号", "話者", "セリフ"]];
  var values = header.concat(rows);
  sheet.getRange(1, 1, values.length, 3).setValues(values);
}

function buildNextSheetName_(ss, theme) {
  var sheets = ss.getSheets();
  var max = 0;
  var names = {};

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName();
    names[name] = true;
    var match = name.match(/^(\d{3})_/);
    if (match) {
      var num = parseInt(match[1], 10);
      if (num > max) {
        max = num;
      }
    }
  }

  var next = max + 1;
  if (next > 999) {
    next = 1;
  }

  for (var j = 0; j < 999; j++) {
    var candidate = pad3_(next) + "_" + theme;
    if (!names[candidate]) {
      return candidate;
    }
    next++;
    if (next > 999) {
      next = 1;
    }
  }

  throw new Error("No available sheet name");
}

function pad3_(n) {
  var s = String(n);
  while (s.length < 3) {
    s = "0" + s;
  }
  return s;
}

function getTokenFromRequest_(e) {
  var headers = (e && e.headers) ? e.headers : {};
  var auth = headers.Authorization || headers.authorization;
  if (auth && auth.indexOf("Bearer ") === 0) {
    return auth.substring("Bearer ".length).trim();
  }

  var xToken = headers["X-Token"] || headers["x-token"];
  if (xToken) {
    return String(xToken).trim();
  }

  if (e && e.parameter && e.parameter.token) {
    return String(e.parameter.token).trim();
  }

  return "";
}

function getScriptProperty_(key) {
  var value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error("Missing Script Property: " + key);
  }
  return value;
}

function jsonResponse_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
