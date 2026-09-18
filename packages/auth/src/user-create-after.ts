export type AuthCreatedUser = {
  id: string;
  email: string;
  name: string;
};

type PersonalAgencyOnUserCreate = (
  actorUserId: string,
  input: { name: string },
) => Promise<unknown>;

type UserCreateAfterDependencies = {
  schedulePolarCustomerSetup: (user: AuthCreatedUser) => void;
  logError: (message: string, error: unknown) => void;
};

export function createUserCreateAfterHandler({
  schedulePolarCustomerSetup,
  logError,
}: UserCreateAfterDependencies) {
  let personalAgencyOnUserCreate: PersonalAgencyOnUserCreate | null = null;

  return {
    registerPersonalAgencyOnUserCreate(callback: PersonalAgencyOnUserCreate) {
      personalAgencyOnUserCreate = callback;
    },

    async afterUserCreate(user: AuthCreatedUser) {
      schedulePolarCustomerSetup(user);

      if (!personalAgencyOnUserCreate) {
        return;
      }

      try {
        await personalAgencyOnUserCreate(user.id, { name: user.name });
      } catch (error) {
        logError("Personal Agency setup failed:", error);
        throw error;
      }
    },
  };
}
