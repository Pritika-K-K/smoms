import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const standardCodes = [
  { match: 'assembly', code: 'ASM' },
  { match: 'machining', code: 'MCH' },
  { match: 'stamping', code: 'STMP' },
  { match: 'quality', code: 'QUAL' },
  { match: 'electrical', code: 'ELEC' },
  { match: 'logistics', code: 'LOG' },
  { match: 'foundry', code: 'FND' },
  { match: 'tooling', code: 'TOOL' },
  { match: 'paint', code: 'PNT' },
];

async function main() {
  console.log("Updating department codes in database...");
  const departments = await prisma.department.findMany();
  
  for (const dept of departments) {
    const lowerName = dept.name.toLowerCase();
    let targetCode = null;
    
    for (const rule of standardCodes) {
      if (lowerName.includes(rule.match)) {
        targetCode = rule.code;
        break;
      }
    }
    
    if (!targetCode) {
      targetCode = dept.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 3) || 'DEPT';
    }
    
    if (dept.code !== targetCode) {
      await prisma.department.update({
        where: { id: dept.id },
        data: { code: targetCode },
      });
      console.log(`Updated Department "${dept.name}" code: ${dept.code} -> ${targetCode}`);
    } else {
      console.log(`Department "${dept.name}" already has code: ${dept.code}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
