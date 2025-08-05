module.exports = {
  'src/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  'src-electron/**/*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  '*.{js,jsx,ts,tsx}': ['eslint --fix', 'prettier --write'],
  'src/**/*.{json,css}': ['prettier --write'],
  '*.{json,css}': ['prettier --write'],
}
