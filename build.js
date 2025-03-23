const fs = require('fs');
const path = require('path');

// Function to create directory if it doesn't exist
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to copy directory recursively
function copyDir(src, dest) {
    ensureDirectoryExists(dest);
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

// Main build process
function build() {
    console.log('Starting build process...');

    // Define source and destination directories
    const directories = {
        js: { src: 'src/js', dest: 'js' },
        assets: { src: 'src/assets', dest: 'assets' },
        styles: { src: 'src/styles', dest: 'styles' },
        components: { src: 'src/components', dest: 'components' },
        data: { src: 'src/data', dest: 'data' }
    };

    // Copy each directory
    for (const [name, { src, dest }] of Object.entries(directories)) {
        if (fs.existsSync(src)) {
            console.log(`Copying ${name} files...`);
            copyDir(src, dest);
        }
    }

    console.log('Build completed successfully!');
}

// Run the build
build(); 