/**
 * @type {import('@types/tailwindcss/tailwind-config').TailwindConfig}
 */
module.exports = {
  content: [
    "./node_modules/flowbite-react/**/*.js",
    "./pages/**/*.{js,ts,jsx,tsx}",
    './components/**/*.{js,ts,jsx,tsx}',
    "./public/**/*.html",
  ],
  plugins: [
    require('@tailwindcss/forms'),
  ],
  theme: {},
};
