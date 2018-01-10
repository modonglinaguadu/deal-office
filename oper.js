const unzip = require("unzip");
const path = require('path')
const archiver = require('archiver');
const fs = require('fs')
const Promise = require('bluebird');
const ncp = require('ncp').ncp;
const readdir = Promise.promisify(fs.readdir);
const stat = Promise.promisify(fs.stat);
const join = path.join;
ncp.limit = 16;

const ipc = require('electron').ipcRenderer


//run =======================================================

var dealFileName = [];

module.exports = run;

function run(arr, table, trueCbk, falseCbk, tipCbk) {
    var targetUrl = arr[0];
    var buildUrl = arr[1]

    readdirp(targetUrl).then(res => {
        var flag = true;
        var fileArr = [];
        res.map((item) => {
            const extname = path.extname(path.basename(item))
            if (extname === '.doc' || extname === '.xls') {
                flag = false;
                fileArr.push(item);
            }
            if (extname === '.docx' || extname === '.xlsx') {
                dealFileName.push(path.relative(targetUrl, item));
            }
        })
        if (!flag) {
            ipc.send('open-information-dialog', fileArr)
        } else {
            task();
        }

        ipc.on('information-dialog-selection', function (event, index) {
            if (index === 0) {
                tipCbk(fileArr)
            } else if (index === 1) {
                console.log('继续执行')
                task()
            }
        })

        function task() {
            var i = 0;
            var queue = [];
            for (i; i < table.length; i++) {
                var cpFile = join(buildUrl, table[i].name);
                var isExist = fsExistsSync(cpFile)
                if (!isExist) {
                    fs.mkdirSync(cpFile)
                }
                queue.push(copyFolder(targetUrl, cpFile));
            }
            Promise.all(queue).then(() => {
                console.log('end copy')
                var n = 0;

                var queueTask = tco(function () {
                    console.log('runrun')
                    if (n < table.length) {
                        console.log('--------' + table[n].name + '----------')
                        var cpFile = join(buildUrl, table[n].name);
                        dealFile(cpFile, function (xmlContent, file) {
                            const ext = path.extname(file)
                            if (ext === ".xlsx") {
                                table[n].data.map(item => {
                                    const reg = new RegExp('(\<si\>.*?)' + item.target + '(.*?\<\/si\>)', 'g');
                                    xmlContent = xmlContent.replace(reg, "$1" + item.content + "$2");
                                })
                            } else if (ext === ".docx") {
                                table[n].data.map(item => {
                                    const reg = new RegExp('(\<w\:t\>.*?)' + item.target + '(.*?\<\/w\:t\>)', 'g');
                                    xmlContent = xmlContent.replace(reg, "$1" + item.content + "$2");
                                })
                            }

                            // console.log(xmlContent);
                            return xmlContent;
                        }).then(() => {
                            n++;
                            queueTask();
                        }).catch(err => {
                            falseCbk(err)
                        })
                    } else {
                        trueCbk();
                    }
                })
                queueTask();
            })
        }
    });
}


function tco(f) {
    var value;
    var active = false;
    var accumulated = [];

    return function accumulator() {
        accumulated.push(arguments);
        if (!active) {
            active = true;
            while (accumulated.length) {
                value = f.apply(this, accumulated.shift());
            }
            active = false;
            return value;
        }
    };
}



function dealFile(cpFile, dealReg) {
    return new Promise((resolve, reject) => {
        // var queue = [];
        cpFile = path.normalize(cpFile);

        // dealFileName.map(item => {
        //     var src = join(cpFile, item);
        //     const extname = path.extname(path.basename(src));
        //     queue.push(changeFile(src, extname, dealReg))
        // })
        // Promise.all(queue).then(() => {
        //     resolve();
        // }).then((err) => {
        //     reject(err);
        // })

        var n = 0;

        var queueTask1 = tco(function () {
            if (n < dealFileName.length) {
                var item = dealFileName[n];
                var src = join(cpFile, item);
                const extname = path.extname(path.basename(src));
                changeFile(src, extname, dealReg).then(() => {
                    n++;
                    queueTask1()
                }).catch((err) => {
                    // console.log(err + '==============================');
                    reject(err);
                })
            } else {
                resolve()
            }
        })
        queueTask1();
    })
}

// test();

// function test() {
//     var arr1 = ['F:\\work\\node-test\\nodeoffice\\build\\one\\2.docx', 'F:\\work\\node-test\\nodeoffice\\build\\one\\中行基金产品参数表8.0版（宏源9号X类35天（A59X4G））.xlsx']

//     var list = [];
//     arr1.map((item) => {
//         const extname = path.extname(path.basename(item));
//         list.push(changeFile(item, extname, function (xmlContent) {
//             var reg = new RegExp('B2222', 'g')
//             return xmlContent.replace(reg, 'A4444');
//         }))
//     })
//     Promise.all(list).then(() => {
//         console.log('done!!!')
//     })
// }



// end run =======================================================

//judge the dir whethe exist
function fsExistsSync(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}

//read dir
function readdirp(src) {
    return stat(src).then(stats => {
        if (stats.isDirectory()) {
            return readdir(src).then(res =>
                Promise.all(res.map(item =>
                    readdirp(join(src, item))))
            ).then(subtree => {
                return [].concat(...subtree);
            });
        } else {
            return [src];
        }
    });
}


//copy dir
function copyFolder(file, output) {
    return new Promise((resolve, reject) => {
        ncp(file, output, function (err) {
            if (err) {
                reject(err);
            }
            resolve()
        });
    })
}

//delete folder
function deleteFolder(path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = join(path, file);
            if (fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolder(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
}




//change the xlsx or docx
function changeFile(file, type, dealReg) {
    return new Promise((resolve, reject) => {
        // console.log(file)
        //const
        if (type === '.docx') {
            var baseName = path.basename(file, '.docx');
            var temName = baseName + 'docx';
            var fileDir = path.dirname(file);
            var temUrl = join(fileDir, temName);
            var xmlUrl = join(fileDir, temName, 'word', 'document.xml');
            var temFile = join(fileDir, temName + '.docx')
        } else if (type === '.xlsx') {
            var baseName = path.basename(file, '.xlsx');
            var temName = baseName + 'xlsx';
            var fileDir = path.dirname(file);
            var temUrl = join(fileDir, temName);
            var xmlUrl = join(fileDir, temName, 'xl', 'sharedStrings.xml');
            var temFile = join(fileDir, temName + '.xlsx')
        }


        fs.createReadStream(file).pipe(unzip.Extract({
            path: temUrl
        })).on('close', function () {
            fs.readFile(xmlUrl, function (err, chunk) {
                var xmlContent = chunk.toString()

                xmlContent = dealReg(xmlContent, file)

                fs.writeFile(xmlUrl, xmlContent, function (err) {
                    if (!err) {
                        var output = fs.createWriteStream(temFile);
                        var archive = archiver('zip', {
                            zlib: {
                                level: 9
                            }
                        });
                        output.on('close', function () {
                            deleteFolder(temUrl)
                            // fs.unlinkSync(file)
                            fs.rename(temFile, file);
                            console.log('处理【 ' + path.basename(file) + ' 】文件成功');
                            resolve();
                        });
                        output.on('end', function () {
                            console.log('Data has been drained');
                        });
                        archive.on('warning', function (err) {
                            if (err.code === 'ENOENT') {
                                // log warning
                            } else {
                                // throw error
                                throw err;
                            }
                        });
                        archive.on('error', function (err) {
                            reject(err);
                        });
                        archive.pipe(output);

                        archive.directory(temUrl, false);
                        archive.finalize();
                    }
                });
            })
        });
    })

}