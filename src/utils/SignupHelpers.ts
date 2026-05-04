//Universal email regex
export const isValidEmail = (inputEmail: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(inputEmail);
};

//Universal password regex
export const isValidPassword = (inputPassword: string) => {
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{13,}$/;
  return passwordRegex.test(inputPassword);
};

export const getPasswordRequirements = (password: string) => ({
  hasUppercase: /[A-Z]/.test(password),
  hasLowercase: /[a-z]/.test(password),
  hasNumber: /\d/.test(password),
  hasSymbol: /[\W_]/.test(password),
  hasMinLength: password.length >= 10,
});