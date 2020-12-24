const { src, dest, series, parallel, watch } = require('gulp');
const env = process.env.NODE_ENV;

const gulpif = require('gulp-if');
const del = require('del');
const browserSync = require('browser-sync').create();
const concat = require('gulp-concat');
const sourcemaps = require('gulp-sourcemaps');
const fileInclude = require('gulp-file-include');
const htmlmin = require('gulp-htmlmin');
const replace = require('gulp-replace');
const sass = require('gulp-sass');
sass.compiler = require('node-sass');
const sassGlob = require('gulp-sass-glob');
const postcss = require('gulp-postcss');
const pxtorem = require('postcss-pxtorem');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const groupmedia = require('gulp-group-css-media-queries');
const babel = require('gulp-babel');
const uglify = require('gulp-uglify');
const svgSprite = require('gulp-svg-sprite');
const imagemin = require('gulp-imagemin');
const changed = require('gulp-changed');
const favicon = require('gulp-favicons');

/* Paths */
const srcPath = 'src';
const destPath = 'docs';
const path = {
    clean: destPath,
    src: {
        html: `${srcPath}/pages/*.html`,
        css: `${srcPath}/assets/styles/main.scss`,
        js: `${srcPath}/assets/scripts/main.js`,
        sprite: `${srcPath}/assets/images/sprite/**/*.svg`,
        favicons: `${srcPath}/assets/images/favicon/*.{jpg,png,svg,gif,ico,svg}`,
        img: `${srcPath}/assets/images/**/*.{jpg,png,svg,gif,ico}`,
        font: `${srcPath}/assets/fonts/**/*.{woff,woff2}`,
    },
    watch: {
        html: `${srcPath}/**/*.html`,
        css: `${srcPath}/**/*.scss`,
        js: `${srcPath}/**/*.js`,
        img: `${srcPath}/assets/images/**/*.{jpg,png,svg,gif,ico}`,
        font: `${srcPath}/assets/fonts/**/*.{ttf,woff,woff2}`,
    },
    build: {
        html: destPath,
        css: `${destPath}/assets`,
        js: `${destPath}/assets`,
        img: `${destPath}/assets/images`,
        favicons: `${destPath}/assets/images/favicons`,
        font: `${destPath}/assets/fonts`,
    },
    styleLibs: [
        /*'node_modules/normalize.css/normalize.css'*/
    ],
    scriptLibs: [
        /*'node_modules/bootstrap/js/dist/modal.js'*/
    ],
};

/* Tasks */
function clean() {
    return del(path.clean);
}

function server() {
    browserSync.init({
        watch: true,
        server: {
            baseDir: destPath,
        },
    });
}

function observe() {
    watch(path.watch.html, html);
    watch(path.watch.css, css);
    watch(path.watch.js, js);
    watch(path.watch.img, img);
    watch(path.watch.font, font);
}

function html() {
    return src(path.src.html)
        .pipe(fileInclude({ prefix: '@@' }))
        .pipe(
            gulpif(
                env === 'prod',
                htmlmin({
                    removeComments: true,
                    collapseWhitespace: true,
                })
            )
        )
        .pipe(replace('../../assets', 'assets'))
        .pipe(dest(path.build.html));
}

function css() {
    return src([...path.styleLibs, path.src.css])
        .pipe(gulpif(env === 'dev', sourcemaps.init()))
        .pipe(concat('style.min.css'))
        .pipe(sassGlob())
        .pipe(sass().on('error', sass.logError))
        .pipe(gulpif(env === 'prod', groupmedia()))
        .pipe(
            postcss([
                pxtorem({
                    rootValue: 16,
                    unitPrecision: 5,
                    propList: ['*'],
                    replace: true,
                    mediaQuery: false,
                    minPixelValue: 2,
                }),
            ])
        )
        .pipe(
            gulpif(
                env === 'prod',
                postcss([
                    autoprefixer({}),
                    cssnano({
                        zindex: false,
                        discardComments: { removeAll: true },
                    }),
                ])
            )
        )
        .pipe(gulpif(env === 'dev', sourcemaps.write()))
        .pipe(dest(path.build.css));
}

function js() {
    return src([...path.scriptLibs, path.src.js])
        .pipe(gulpif(env === 'dev', sourcemaps.init()))
        .pipe(concat('script.min.js', { newLine: ';' }))
        .pipe(
            gulpif(
                env === 'prod',
                babel({
                    presets: ['@babel/env'],
                })
            )
        )
        .pipe(gulpif(env === 'prod', uglify()))
        .pipe(gulpif(env === 'dev', sourcemaps.write()))
        .pipe(dest(path.build.js));
}

function img() {
    src(path.src.sprite)
        .pipe(
            svgSprite({
                mode: {
                    symbol: { sprite: '../sprite.svg' },
                },
            })
        )
        .pipe(dest(path.build.img));
    src(path.src.favicons)
        .pipe(
            favicon({
                icons: {
                    appleIcon: true,
                    favicons: true,
                    online: false,
                    appleStartup: false,
                    android: false,
                    firefox: false,
                    yandex: false,
                    windows: false,
                    coast: false,
                },
            })
        )
        .pipe(dest(path.build.favicons));
    return src([path.src.img, '!' + path.src.sprite, '!' + path.src.favicons])
        .pipe(changed(path.build.img))
        .pipe(imagemin([
            imagemin.gifsicle({interlaced: true}),
            imagemin.mozjpeg({quality: 75, progressive: false}),
            imagemin.optipng({optimizationLevel: 5}),
            imagemin.svgo({
                plugins: [
                    {removeViewBox: true},
                    {cleanupIDs: false},
                    // {removeAttrs: { attrs: '(fill|stroke|style|width|height|data.*)' }}
                ]
            })
        ]))
        .pipe(dest(path.build.img));
}

function font() {
    return src(path.src.font).pipe(dest(path.build.font));
}

exports.default = series(
    clean,
    parallel(html, css, js, img, font),
    parallel(observe, server)
);
