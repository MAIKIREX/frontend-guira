const fs = require('fs');
const filePath = 'c:/Users/WitronVentas/Desktop/Aplicaciones/Guira/backend/m-guira/features/payments/components/create-payment-order-form.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /<SectionHeading[^>]*eyebrow=[^>]*Etapa 3.*?Paso[\s\S]*?\/>/g;
const matches = content.match(regex);
console.log('Found ' + (matches ? matches.length : 0) + ' matches with Paso');

content = content.replace(regex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced and saved successfully.');
