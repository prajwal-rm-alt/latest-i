const fs = require('fs');
let content = fs.readFileSync('services/excelExportService.ts', 'utf8');

const mrStart = content.indexOf('export const MR_PRODUCTS = [');
const mrEnd = content.indexOf('];', mrStart);

const mrProductsStr = `export const MR_PRODUCTS = [
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
  { category: 'OTG', rdArticle: '492861834', description: 'MORPHY RICHARDS OTG 52 RSS B DIGICHEF 35L' },
  { category: 'OTG', rdArticle: '494343634', description: 'MORPHY RICHARDS OTG 52 RSS B DIGICHEF 35L' },
  { category: 'MWO', rdArticle: '491932215', description: 'MORPHY RICHARDS MWO 20MS SOLO 20L' },
  { category: 'MWO', rdArticle: '491932214', description: 'MORPHY RICHARDS MWO 20MS SOLO BLACK 20L' },
  { category: 'Room Heater', rdArticle: '491932845', description: 'MR FAN HEATER ARISTO PTC LWT 2000W' },
  { category: 'Room Heater', rdArticle: '491932846', description: 'MR FAN HEATER ORBIT PTC LWT 2000W' }
`;

content = content.substring(0, mrStart) + mrProductsStr + content.substring(mrEnd);

fs.writeFileSync('services/excelExportService.ts', content);
