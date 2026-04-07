/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: { 50: '#EFF6FF', 100: '#DBEAFE', 500: '#3B82F6', 600: '#2563EB', 700: '#1D4ED8' },
        success: { 50: '#ECFDF5', 500: '#10B981', 600: '#059669' },
        warning: { 50: '#FFFBEB', 500: '#F59E0B', 600: '#D97706' },
        danger:  { 50: '#FEF2F2', 500: '#EF4444', 600: '#DC2626' },
      },
    },
  },
  plugins: [],
};
