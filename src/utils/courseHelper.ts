export const generateSessions = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const academicYear = currentMonth >= 8 ? currentYear : currentYear - 1;

  return [
    'All',
    `${academicYear}/${academicYear + 1}`, 
    `${academicYear - 1}/${academicYear}`, 
    `${academicYear - 2}/${academicYear - 1}`,
  ];
};