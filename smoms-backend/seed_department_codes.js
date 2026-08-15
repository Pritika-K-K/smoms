import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const codeMap = {
  'Machining & Milling': 'MCH',
  'Assembly & Integration': 'ASM',
  'Electrical Maintenance': 'ELEC',
  'Quality Assurance & Testing': 'QUAL',
  'Logistics & Material Handling': 'LOG',
  'Foundry & Casting': 'FND',
  'Stamping & Fabrication': 'STMP',
  'Tooling & Die': 'TOOL',
  'Paint & Coating': 'PNT'
};

async function main() {
  console.log("Populating department codes for existing departments...");
  const departments = await prisma.department.findMany();
  
  for (const dept of departments) {
    let deptCode = dept.code;
    if (!deptCode) {
      if (codeMap[dept.name]) {
        deptCode = codeMap[dept.name];
      } else {
        const clean = dept.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
        deptCode = clean.substring(0, 4) || 'DEPT';
      }
      
      // Ensure uniqueness
      let uniqueCode = deptCode;
      let counter = 1;
      while (await prisma.department.findFirst({ where: { code: uniqueCode, id: { not: dept.id } } })) {
        uniqueCode = `${deptCode}${counter}`;
        counter++;
      }

      await prisma.department.update({
        where: { id: dept.id },
        data: { code: uniqueCode }
      });
      console.log(`Updated Department "${dept.name}" with code "${uniqueCode}"`);
    } else {
      console.log(`Department "${dept.name}" already has code "${deptCode}"`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
