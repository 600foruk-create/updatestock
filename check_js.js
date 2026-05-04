
try {
    const fs = require('fs');
    const content = fs.readFileSync('assets/js/main.js', 'utf8');
    let openBraces = 0;
    let closedBraces = 0;
    let openParens = 0;
    let closedParens = 0;
    
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '{') openBraces++;
        if (content[i] === '}') closedBraces++;
        if (content[i] === '(') openParens++;
        if (content[i] === ')') closedParens++;
    }
    
    console.log(`Braces: { ${openBraces}, } ${closedBraces}, diff: ${openBraces - closedBraces}`);
    console.log(`Parens: ( ${openParens}, ) ${closedParens}, diff: ${openParens - closedParens}`);
    
    // Check for obvious syntax errors
    const esprima = require('esprima');
    try {
        esprima.parseScript(content);
        console.log('Syntax OK');
    } catch (e) {
        console.log('Syntax Error: ' + e.message + ' at ' + e.index);
        // Find line number
        const lines = content.substring(0, e.index).split('\n');
        console.log('Line: ' + lines.length);
    }
} catch (e) {
    console.log('Error: ' + e.message);
}
