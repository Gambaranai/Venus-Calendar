const Astronomy = require('astronomy-engine');

const date = new Date();
const illum = Astronomy.Illumination(Astronomy.Body.Venus, date);
console.log(illum);
