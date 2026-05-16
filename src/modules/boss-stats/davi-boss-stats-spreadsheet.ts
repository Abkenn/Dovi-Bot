const DATA_START_ROW_NUMBER = 3;

export type DaviBossStatsSpreadsheetRow = {
  rowNumber: number;
  game: string;
  boss: string;
  deaths: string;
  totalAttemptTime: string;
  winningAttemptTime: string;
  difficultyCoefficient: string;
};

const getSpreadsheetCsvUrl = (spreadsheetUrl: string) => {
  const url = new URL(spreadsheetUrl);
  const pathParts = url.pathname.split('/').filter(Boolean);
  const spreadsheetId = pathParts[pathParts.indexOf('d') + 1];

  if (!spreadsheetId) {
    throw new Error(
      'DAVI_BOSS_STATS_SPREADSHEET_URL must be a Google Sheet URL.',
    );
  }

  const gid = url.searchParams.get('gid');
  const csvUrl = new URL(
    `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export`,
  );

  csvUrl.searchParams.set('format', 'csv');

  if (gid) {
    csvUrl.searchParams.set('gid', gid);
  }

  return csvUrl;
};

const parseCsv = (csv: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1;
      }

      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      continue;
    }

    field += character;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows;
};

const mapDataRows = (csv: string): DaviBossStatsSpreadsheetRow[] => {
  const dataRows = parseCsv(csv).slice(DATA_START_ROW_NUMBER - 1);
  const spreadsheetRows: DaviBossStatsSpreadsheetRow[] = [];

  for (const [index, row] of dataRows.entries()) {
    const rowNumber = DATA_START_ROW_NUMBER + index;
    const game = (row[0] ?? '').trim();
    const boss = (row[1] ?? '').trim();

    if (!game && !boss) {
      break;
    }

    spreadsheetRows.push({
      rowNumber,
      game,
      boss,
      deaths: (row[2] ?? '').trim(),
      totalAttemptTime: (row[3] ?? '').trim(),
      winningAttemptTime: (row[4] ?? '').trim(),
      difficultyCoefficient: (row[5] ?? '').trim(),
    });
  }

  return spreadsheetRows;
};

export const fetchDaviBossStatsSpreadsheetRows = async ({
  spreadsheetUrl,
  signal,
}: {
  spreadsheetUrl: string;
  signal?: AbortSignal;
}) => {
  const csvUrl = getSpreadsheetCsvUrl(spreadsheetUrl);
  const response = await fetch(csvUrl, signal ? { signal } : undefined);

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Davi boss stats spreadsheet: ${response.status} ${response.statusText}`,
    );
  }

  return mapDataRows(await response.text());
};
