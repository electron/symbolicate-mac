require('fs').writeFileSync('./tmp.txt', process.env.STACK.replace(/\|\|\|/g, '\n'));
