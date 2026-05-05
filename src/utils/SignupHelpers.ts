//Universal email regex
export const isValidEmail = (inputEmail: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(inputEmail.trim());
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
export const isValidWebsite = (url: string) => {
    const websiteRegex = /\.[a-z]{2,}$/i;
    return websiteRegex.test(url.trim());
  };