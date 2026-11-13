import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL não foi definida. Configure o arquivo .env antes de executar o seed.');
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

async function main(): Promise<void> {
  await prisma.project.createMany({
    data: [
      { id: 1, name: 'Sistema Web', description: 'Portal principal para clientes.' },
      { id: 2, name: 'Aplicativo Mobile', description: 'Aplicativo para dispositivos móveis.' },
      { id: 3, name: 'Portal Acadêmico', description: 'Serviços digitais para estudantes.' },
    ],
    skipDuplicates: true,
  });
  console.log('Projetos iniciais verificados; projetos já existentes foram preservados.');
}

main()
  .catch((error: unknown) => {
    console.error('Falha ao popular os dados iniciais:', error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
