import { User } from '../types/firebase';

export const canManageSubscriptions = (
  user: Pick<User, 'usertype' | 'isInstitutionAdmin'>,
) =>
  user.usertype === 'otherUser' ||
  (user.usertype === 'enterprise' && user.isInstitutionAdmin === true);
