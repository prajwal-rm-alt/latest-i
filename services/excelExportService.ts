import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { UserProfile } from '../types';

export const BAJAJ_PRODUCTS = [
  { category: 'COOKTOPS', rdArticle: '494338753', description: 'BAJAJ COOKTOP 2BR GP6 2B BLACK' },
  { category: 'COOKTOPS', rdArticle: '491454780', description: 'BAJAJ COOKTOP CGX4 ECO GLASS 4 BURNER' },
  { category: 'COOKTOPS', rdArticle: '494459543', description: 'Bajaj UCX 2B- 2 Burner' },
  { category: 'COOKTOPS', rdArticle: '494459544', description: 'Bajaj UCX 3B- 3 Burner' },
  { category: 'DRY IRON/Steam Iron', rdArticle: '491186175', description: 'BAJAJ MAJESTY DX4 DRY IRON 1000W WHITE' },
  { category: 'DRY IRON/Steam Iron', rdArticle: '492664385', description: 'Bajaj Steam Iron MX 3 Neo 1250W' },
  { category: 'DRY IRON/Steam Iron', rdArticle: '494426359', description: 'BAJAJ LIGHT WEIGHT STEAM IRON MX 45 2000W' },
  { category: 'ELECTRIC KETTLE', rdArticle: '491281340', description: 'BAJAJ ELECTRIC KETTLE KTX 1.7L' },
  { category: 'FOOD PROCESSOR', rdArticle: '491892015', description: 'BAJAJ FOOD PROCESSOR FX 1000 DLX 1000W' },
  { category: 'HAND BLENDER', rdArticle: '492573221', description: 'BAJAJ HAND BLENDER HB 21 BK 300W' },
  { category: 'HAND BLENDER', rdArticle: '492573222', description: 'BAJAJ HAND BLENDER HB 22 BL 300W' },
  { category: 'HAND BLENDER', rdArticle: '491903207', description: 'Bajaj Hand Blender Juvel 300W' },
  { category: 'HAND MIXER', rdArticle: '491281345', description: 'BAJAJ HAND MIXER HM01 250 WATTS' },
  { category: 'INDUCTION COOKTOPS', rdArticle: '494459702', description: 'BAJAJ INDUCTION COOKTOP 1400W ICX 140TS' },
  { category: 'INDUCTION COOKTOPS', rdArticle: '494459699', description: 'BAJAJ INDUCTION COOKTOP 1900W ICX 190FS' },
  { category: 'INDUCTION COOKTOPS', rdArticle: '494459697', description: 'BAJAJ INFRARED COOKTOP 2200W IRX 220F' },
  { category: 'INSTANT GEYSER', rdArticle: '494426479', description: 'BAJAJ INSTANT GEYSER AERONO 3L 3KW' },
  { category: 'INSTANT GEYSER', rdArticle: '494226762', description: 'BAJAJ VERRE INSTANT GEYSER 3L' },
  { category: 'STORAGE GEYSER', rdArticle: '494510703', description: 'BAJAJ STORAGE GEYSER NEW SHAKTI PRO 10L' },
  { category: 'STORAGE GEYSER', rdArticle: '494510704', description: 'BAJAJ STORAGE GEYSER NEW SHAKTI PRO 15L' },
  { category: 'STORAGE GEYSER', rdArticle: '494510705', description: 'BAJAJ STORAGE GEYSER NEW SHAKTI PRO 25L' },
  { category: 'STORAGE GEYSER', rdArticle: '494459605', description: 'BAJAJ STORAGE GEYSER PENTACLE 10L' },
  { category: 'STORAGE GEYSER', rdArticle: '494426477', description: 'BAJAJ STORAGE GEYSER PENTACLE 15L' },
  { category: 'STORAGE GEYSER', rdArticle: '494426478', description: 'BAJAJ STORAGE GEYSER PENTACLE 25L' },
  { category: 'JUICER', rdArticle: '492284015', description: 'Bajaj Juicer JEX16 2L 800W' },
  { category: 'MIXERS', rdArticle: '492391787', description: 'BAJAJ MIXER GRINDER GX15 500W' },
  { category: 'MIXERS', rdArticle: '494338785', description: 'BAJAJ MIXER GRINDER 3 JAR 500W GX16' },
  { category: 'MIXERS', rdArticle: '494226658', description: 'BAJAJ MIXER 500W 3JARS GRACIO LILAC' },
  { category: 'MIXERS', rdArticle: '494622900', description: 'BAJAJ MIXER GRINDER 3 JAR 500W KOMPACT' },
  { category: 'MIXERS', rdArticle: '494226661', description: 'BAJAJ MIXER 750W 4JARS VIRTUE BLACK' },
  { category: 'MIXERS', rdArticle: '494459717', description: 'BAJAJ MG 1000W 4J EVOQUE JET BLK' },
  { category: 'MIXERS', rdArticle: '494622897', description: 'BAJAJ MIXER GRINDER 5 JOW STYLE MIX' },
  { category: 'OTG', rdArticle: '491891845', description: 'BAJAJ OTG 2800TMCS 28L SILVER' },
  { category: 'OTG', rdArticle: '490438859', description: 'BAJAJ OTG MISTY 1603 T SILVR 1200W 16LTR' },
  { category: 'OTG', rdArticle: '491213738', description: 'BAJAJ OTG 2200MST' },
  { category: 'POP UP TOASTERS', rdArticle: '490614124', description: 'BAJAJ POP UP TOASTER ATX 4' },
  { category: 'SANDWICH MAKERS', rdArticle: '494399374', description: 'BAJAJ SANDWICH MAKER SWX6 GRILL' },
  { category: 'SANDWICH MAKERS', rdArticle: '492284113', description: 'BAJAJ SANDWICH MAKER SWX3 DLX 800W' }
];

export const MR_PRODUCTS = [
  { category: 'AIR FRYER', rdArticle: '494226706', description: 'MORPHY RICHARDS AIR FRYER 5L DIGITAL BL' },
  { category: 'AIR FRYER', rdArticle: '494590785', description: 'MR AIR FRYER 5L DIGITAL CRISP PRO BLUE' },
  { category: 'MIXERS', rdArticle: '494338716', description: 'MR MIXER GRINDER RITZA 500W' },
  { category: 'MIXERS', rdArticle: '494338787', description: 'MR MIXER GRINDER FUSION 750W' },
  { category: 'MIXERS', rdArticle: '494338783', description: 'MR MIXER POP UP 4 JARS GRINDER PRO MAXX' },
  { category: 'POP UP TOASTERS', rdArticle: '494226832', description: 'MR POP UP TOASTER ATX 4' },
  { category: 'HAND BLENDER', rdArticle: '494226825', description: 'MORPHY HAND BLENDER PRONTO PLUS 300W' },
  { category: 'HAND BLENDER', rdArticle: '494226826', description: 'MORPHY HAND BLENDER PRONTO PLUS 300W' },
  { category: 'SANDWICH MAKERS', rdArticle: '491891904', description: 'MR Sandwich Maker SM3006 1S VL BLACK' },
  { category: 'SANDWICH MAKERS', rdArticle: '491891905', description: 'MR Sandwich Maker SM3006 1S VL BLACK' },
  { category: 'SANDWICH MAKERS', rdArticle: '494405195', description: 'MR SANDWICH MAKER SM3007 750W' },
  { category: 'GARMENT STEAMER', rdArticle: '494405194', description: 'MR GARMENT STEAMER STEAM ELITE 1500W' },
  { category: 'GARMENT STEAMER', rdArticle: '494405193', description: 'MR GARMENT STEAMER SUPER BRIGHT' },
  { category: 'STEAM IRON', rdArticle: '491186076', description: 'MORPHY RICHARDS STEAM IRON SUPER GLIDE 2000W' },
  { category: 'STEAM IRON', rdArticle: '491186075', description: 'MORPHY RICHARDS STEAM IRON SUPERGLIDE 1500W' },
  { category: 'STEAM IRON', rdArticle: '491186080', description: 'MR STEAM IRON ULTRA GLIDE 1500W' },
  { category: 'STEAM IRON', rdArticle: '491186083', description: 'MR STEAM IRON ULTRA GLIDE 2000W' },
  { category: 'OTG', rdArticle: '494343664', description: 'MR OTG 29 RCAP DIGI' },
  { category: 'OTG', rdArticle: 'N/A', description: 'MR OTG 60 RCSS B' },
  { category: 'OTG', rdArticle: 'N/A', description: 'MR OTG 60L' },
  { category: 'OTG', rdArticle: '492861834', description: 'MORPHY RICHARDS OTG 52 RSS B DIGICHEF 35L' },
  { category: 'OTG', rdArticle: '494343634', description: 'MORPHY RICHARDS OTG 52 RSS B DIGICHEF 35L' },
  { category: 'MWO', rdArticle: '491932215', description: 'MORPHY RICHARDS MWO 20MS SOLO 20L' },
  { category: 'MWO', rdArticle: '491932214', description: 'MORPHY RICHARDS MWO 20MS SOLO BLACK 20L' },
  { category: 'Room Heater', rdArticle: '491932845', description: 'MR FAN HEATER ARISTO PTC LWT 2000W' },
  { category: 'Room Heater', rdArticle: '491932846', description: 'MR FAN HEATER ORBIT PTC LWT 2000W' }
];

export const generateMonthlyExcelReport = async (user: UserProfile, adjustedData: Record<string, Record<number, number>>, monthDate: Date) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const workbook = new ExcelJS.Workbook();

  const createSheet = (brand: 'Bajaj' | 'Morphy Richards', products: any[]) => {
    const sheetName = brand === 'Bajaj' ? 'Bajaj' : 'Morphy Richards';
    const ws = workbook.addWorksheet(sheetName, {
      views: [{ showGridLines: false }]
    });

    ws.columns = [
      { width: 20 },
      { width: 10 },
      { width: 15 },
      { width: 45 },
      { width: 10 },
      ...Array.from({ length: 31 }, () => ({ width: 4 })),
      { width: 12 }
    ];

    const borderStyle: Partial<ExcelJS.Borders> = {
      top: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: '000000' } },
      left: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: '000000' } },
      bottom: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: '000000' } },
      right: { style: 'thin' as ExcelJS.BorderStyle, color: { argb: '000000' } }
    };

    const row1 = ws.addRow([
      'Store Name & Location',
      user.storeNameAndLocation || user.storeName,
      '',
      'Store Code: ' + (user.storeCode || ''),
      'Target Qty'
    ]);
    row1.height = 25;
    row1.getCell(6).value = brand === 'Bajaj' ? 'Retailer Digital Daily Report' : 'Reliance Digital Daily Report';
    row1.getCell(37).value = 'Remarks';

    const row2 = ws.addRow([
      'Bajaj TL Name',
      user.tlName || '',
      '',
      'Date: ' + monthName
    ]);
    row2.height = 25;

    const headers = ['Category', 'Brand', 'Article Code', 'Description', ''];
    for (let i = 1; i <= 31; i++) headers.push(i.toString());
    headers.push('');
    const row3 = ws.addRow(headers);
    row3.height = 25;

    for (let r = 1; r <= 3; r++) {
        for (let c = 1; c <= 37; c++) {
            ws.getCell(r, c).border = borderStyle;
        }
    }

    ws.mergeCells('B1:C1');
    ws.mergeCells('B2:C2');
    ws.mergeCells('E1:E3');
    ws.mergeCells('F1:AJ2');
    ws.mergeCells('AK1:AK3');

    const setCell = (ref: string, bold: boolean, horiz: any) => {
        const cell = ws.getCell(ref);
        cell.font = { bold: bold };
        cell.alignment = { vertical: 'middle', horizontal: horiz, wrapText: false };
    };

    setCell('A1', true, 'left');
    setCell('B1', false, 'left');
    setCell('D1', true, 'left');
    setCell('E1', true, 'center');
    ws.getCell('E1').alignment.wrapText = true;
    setCell('F1', true, 'center');
    ws.getCell('F1').font = { bold: true, size: 12 };
    setCell('AK1', true, 'center');

    setCell('A2', true, 'left');
    setCell('B2', false, 'left');
    setCell('D2', true, 'left');

    for (let c = 1; c <= 37; c++) {
        ws.getCell(3, c).font = { bold: true };
        ws.getCell(3, c).alignment = { vertical: 'middle', horizontal: 'center' };
    }

    let currentRow = 4;
    let currentCategory = '';
    let categoryStartRow = 4;

    products.forEach((product, index) => {
      const rowData = [
          product.category,
          brand === 'Bajaj' ? 'Bajaj' : 'Morphy',
          product.rdArticle,
          product.description,
          ''
      ];

      for (let i = 1; i <= 31; i++) {
          if (i <= daysInMonth) {
              const qty = adjustedData[product.description]?.[i] || 0;
              rowData.push(qty > 0 ? qty : '');
          } else {
              rowData.push('');
          }
      }
      rowData.push('');

      const row = ws.addRow(rowData);
      row.height = 20;

      for (let i = 1; i <= 37; i++) {
        const cell = row.getCell(i);
        cell.border = borderStyle;
        if (i === 4) {
           cell.alignment = { horizontal: 'left', vertical: 'middle' };
        } else {
           cell.alignment = { horizontal: 'center', vertical: 'middle' };
        }
      }

      if (product.category !== currentCategory) {
        if (currentCategory !== '' && currentRow - 1 > categoryStartRow) {
          ws.mergeCells(categoryStartRow, 1, currentRow - 1, 1);
          ws.getCell(categoryStartRow, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        }
        currentCategory = product.category;
        categoryStartRow = currentRow;
      }

      if (index === products.length - 1 && currentRow > categoryStartRow) {
        ws.mergeCells(categoryStartRow, 1, currentRow, 1);
        ws.getCell(categoryStartRow, 1).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      }
      
      currentRow++;
    });
  };

  createSheet('Bajaj', BAJAJ_PRODUCTS);
  createSheet('Morphy Richards', MR_PRODUCTS);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Monthly_Report_${monthName.replace(' ', '_')}.xlsx`);
};
