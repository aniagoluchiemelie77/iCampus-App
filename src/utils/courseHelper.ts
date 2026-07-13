export const generateSessions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  return [
    'All',
    `${academicYear}/${academicYear + 1}`, // Default/Current
    `${academicYear - 1}/${academicYear}`, // Preceding
    `${academicYear - 2}/${academicYear - 1}`,
  ];
};