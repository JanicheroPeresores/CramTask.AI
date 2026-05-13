process.chdir(__dirname + '/../backend');
const app = require('../api/index');
const port = process.env.PORT ? Number(process.env.PORT) : 5001;

app.listen(port, () => {
  console.log('temp api listening on', port);
});

setInterval(() => {}, 1 << 30);
