// Boots something with extra environment variables, then puts the old values back.
// The app reads process.env once at startup (ConfigModule), so set them before creating it.
export async function withEnv<T>(
  vars: Record<string, string>,
  create: () => Promise<T>,
): Promise<T> {
  const previous = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
  Object.assign(process.env, vars);
  try {
    return await create();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}
