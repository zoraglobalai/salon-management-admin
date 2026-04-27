import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../../database/config';
import { User, UserRole } from '../../entities/platform/User';

type CliArgs = {
  email?: string;
  password?: string;
  name?: string;
};

function parseArgs(argv: string[]) {
  return argv.reduce<CliArgs>((acc, arg) => {
    const [key, value] = arg.split('=');

    if (key === '--email') {
      acc.email = value;
    }

    if (key === '--password') {
      acc.password = value;
    }

    if (key === '--name') {
      acc.name = value;
    }

    return acc;
  }, {});
}

async function createSuperUser() {
  const args = parseArgs(process.argv.slice(2));
  const email = args.email?.trim().toLowerCase();
  const password = args.password?.trim();
  const name = args.name?.trim() || 'Super Admin';

  if (!email || !password) {
    throw new Error('Usage: npm run create-super-user -- --email=<email> --password=<password> [--name=<name>]');
  }

  await AppDataSource.initialize();

  const userRepo = AppDataSource.getRepository(User);
  const existingUser = await userRepo.findOne({ where: { email } });

  if (existingUser) {
    throw new Error(`User already exists for email: ${email}`);
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const superAdmin = userRepo.create({
    name,
    email,
    password: passwordHash,
    role: UserRole.SUPER_ADMIN,
    tenantId: null,
    branchId: null,
    isActive: true,
  });

  await userRepo.save(superAdmin);
  await AppDataSource.destroy();

  console.log(`Super admin created: ${email}`);
}

createSuperUser().catch(async (error) => {
  console.error('Failed to create super admin:', error.message || error);

  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  process.exit(1);
});
