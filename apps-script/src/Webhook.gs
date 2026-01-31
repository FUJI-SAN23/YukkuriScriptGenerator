// 列定義は将来拡張を見据えて一箇所に集約する
const SHEET_HEADERS = ["行番号", "話者", "セリフ"];

function doPost(e) {
  const result = handlePostRequest(e);
  return buildJsonResponse(result);
}

function handlePostRequest(e) {
  const configResult = getConfig();
  if (!configResult.ok) {
    return configResult.response;
  }

  const authResult = authenticateRequest(e, configResult.value.token);
  if (!authResult.ok) {
    return authResult.response;
  }

  const requestResult = parseRequestPayload(e);
  if (!requestResult.ok) {
    return requestResult.response;
  }

  const tsvResult = parseTsv(requestResult.value.scriptTsv);
  if (!tsvResult.ok) {
    return tsvResult.response;
  }

  const writeResult = createSheetAndWrite(
    configResult.value.spreadsheetId,
    requestResult.value.theme,
    tsvResult.value.rows
  );
  if (!writeResult.ok) {
    return writeResult.response;
  }

  return buildSuccessResponse(
    writeResult.value.sheetName,
    writeResult.value.rowsWritten,
    tsvResult.value.rowsSkipped
  );
}

function getConfig() {
  // 設定値は Script Properties に集約し、コードに埋め込まない
  const properties = PropertiesService.getScriptProperties();
  const token = properties.getProperty("TOKEN");
  const spreadsheetId = properties.getProperty("SPREADSHEET_ID");

  if (!token || !spreadsheetId) {
    return {
      ok: false,
      response: buildErrorResponse(
        "config_missing",
        "必要な設定が不足しています。",
        0
      ),
    };
  }

  return {
    ok: true,
    value: {
      token: token,
      spreadsheetId: spreadsheetId,
    },
  };
}

function authenticateRequest(e, expectedToken) {
  // GAS ではヘッダ取得が制限されるため、存在しない場合は未認証として扱う
  const headers = e && e.headers ? e.headers : {};
  const token = headers["X-Webhook-Token"] || headers["x-webhook-token"] || "";

  if (!token) {
    return {
      ok: false,
      response: buildErrorResponse("unauthorized", "認証に失敗しました。", 0),
    };
  }

  if (token !== expectedToken) {
    return {
      ok: false,
      response: buildErrorResponse("unauthorized", "認証に失敗しました。", 0),
    };
  }

  return { ok: true };
}

function parseRequestPayload(e) {
  // 本文が空の場合は安全側でエラーにする
  if (!e || !e.postData || !e.postData.contents) {
    return {
      ok: false,
      response: buildErrorResponse("invalid_request", "リクエストが不正です。", 0),
    };
  }

  let payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (error) {
    return {
      ok: false,
      response: buildErrorResponse("invalid_json", "JSON が不正です。", 0),
    };
  }

  const theme = payload && typeof payload.theme === "string" ? payload.theme : "";
  const scriptTsv =
    payload && typeof payload.script_tsv === "string" ? payload.script_tsv : "";

  if (!theme || !scriptTsv) {
    return {
      ok: false,
      response: buildErrorResponse(
        "invalid_payload",
        "必要な項目が不足しています。",
        0
      ),
    };
  }

  return {
    ok: true,
    value: {
      theme: theme,
      scriptTsv: scriptTsv,
    },
  };
}

function parseTsv(tsv) {
  // TSV の解析は副作用を持たない純粋処理として分離する
  if (typeof tsv !== "string") {
    return {
      ok: false,
      response: buildErrorResponse("invalid_tsv", "TSV が不正です。", 0),
    };
  }

  const lines = tsv.split(/\r?\n/);
  const rows = [];
  let skipped = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line || line.trim() === "") {
      // 空行はスキップ対象だがカウントしない
      continue;
    }

    const separatorIndex = line.indexOf("\t");
    if (separatorIndex === -1) {
      skipped += 1;
      continue;
    }

    const speaker = line.slice(0, separatorIndex).trim();
    const speech = line.slice(separatorIndex + 1).trim();

    if (!speaker || !speech) {
      skipped += 1;
      continue;
    }

    rows.push([rows.length + 1, speaker, speech]);
  }

  return {
    ok: true,
    value: {
      rows: rows,
      rowsSkipped: skipped,
    },
  };
}

function createSheetAndWrite(spreadsheetId, theme, rows) {
  // ここでのみスプレッドシートに書き込む
  try {
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    const sheetName = buildSheetName(spreadsheet, theme);
    const sheet = spreadsheet.insertSheet(sheetName);

    const values = [SHEET_HEADERS].concat(rows);
    sheet.getRange(1, 1, values.length, SHEET_HEADERS.length).setValues(values);

    return {
      ok: true,
      value: {
        sheetName: sheetName,
        rowsWritten: rows.length,
      },
    };
  } catch (error) {
    return {
      ok: false,
      response: buildErrorResponse("write_failed", "書き込みに失敗しました。", 0),
    };
  }
}

function buildSheetName(spreadsheet, theme) {
  const sequence = getNextSheetNumber(spreadsheet);
  const normalizedTheme = normalizeTheme(theme);
  return formatSequence(sequence) + "_" + normalizedTheme;
}

function getNextSheetNumber(spreadsheet) {
  // 既存シート名の最大値から次の連番を計算する
  const sheets = spreadsheet.getSheets();
  let maxNumber = 0;

  for (let i = 0; i < sheets.length; i += 1) {
    const name = sheets[i].getName();
    const match = name.match(/^(\d{3})_/);
    if (!match) {
      continue;
    }

    const number = parseInt(match[1], 10);
    if (number > maxNumber) {
      maxNumber = number;
    }
  }

  let next = maxNumber + 1;
  if (next > 999) {
    // 999 超えは仕様に従って 001 に戻す
    next = 1;
  }

  return next;
}

function normalizeTheme(theme) {
  // シート名に使えない文字は _ に置換し、長さを制限する
  const trimmed = theme.trim();
  const replaced = trimmed.replace(/[:\\/\?\[\]]/g, "_");
  return replaced.substring(0, 20);
}

function formatSequence(number) {
  const padded = "000" + number;
  return padded.slice(-3);
}

function buildSuccessResponse(sheetName, rowsWritten, rowsSkipped) {
  return {
    ok: true,
    sheet_name: sheetName,
    rows_written: rowsWritten,
    rows_skipped: rowsSkipped,
  };
}

function buildErrorResponse(code, message, rowsSkipped) {
  return {
    ok: false,
    error: {
      code: code,
      message: message,
    },
    rows_skipped: rowsSkipped,
  };
}

function buildJsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
