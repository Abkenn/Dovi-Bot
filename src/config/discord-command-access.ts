export const COMMAND_ACCESSES = {
  DEFAULT: 'default',
  REGULAR: 'regular',
} as const;

export type CommandAccess =
  (typeof COMMAND_ACCESSES)[keyof typeof COMMAND_ACCESSES];

export const PROD_MEMBER_ROLE_ID = '1137164576618721372';

export type EvaluateCommandAccessInput = {
  access: CommandAccess;
  isProdGuild: boolean;
  roleIds: readonly string[];
  roleNames: readonly string[];
};

export type CommandAccessEvaluation =
  | {
      allowed: true;
    }
  | {
      allowed: false;
      message: string;
      ephemeral: false;
    };

const hasChampionRole = (roleNames: readonly string[]) =>
  roleNames.some((roleName) => {
    const normalizedName = roleName.trim().toLowerCase();

    return normalizedName.includes('champion');
  });

const hasGoldOneRole = (roleNames: readonly string[]) =>
  roleNames.some((roleName) =>
    roleName.trim().toLowerCase().includes('gold 1'),
  );

export const evaluateCommandAccess = ({
  access,
  isProdGuild,
  roleIds,
  roleNames,
}: EvaluateCommandAccessInput): CommandAccessEvaluation => {
  if (!isProdGuild) {
    return { allowed: true };
  }

  if (!roleIds.includes(PROD_MEMBER_ROLE_ID)) {
    return {
      allowed: false,
      message: 'You need the Member role to use Dovi commands.',
      ephemeral: false,
    };
  }

  const isRegular = hasGoldOneRole(roleNames) || hasChampionRole(roleNames);

  if (access === COMMAND_ACCESSES.REGULAR && !isRegular) {
    return {
      allowed: false,
      message: 'You need to be at least Gold to use this command.',
      ephemeral: false,
    };
  }

  return { allowed: true };
};
