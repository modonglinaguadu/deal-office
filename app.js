const ipc = require('electron').ipcRenderer
const shell = require('electron').shell
const run = require('./oper.js');
const fs = require('fs')
const path = require('path')

var app = new Vue({
    el: '#app',
    data: {
        targetSelected: false,
        targetSrc: '点击选择目标目录',
        toSrc: '点击选择生成目录',
        toSelected: false,
        table: [{
            name: '表1',
            data: [{
                target: '',
                content: ''
            }]
        }, ],
        addNum: 1,
        tipShow: false,
        tipCont: [],
        loading: false,
        success: false,
        content: '处理中...'
    },
    methods: {
        seleSrc(tar) {
            ipc.send('open-file-dialog', tar)
        },
        go() {
            if (!this.targetSelected || !this.toSelected) {
                ipc.send('open-error-dialog')
            } else {

                //判断目标目录中是否有表名相同的文件夹
                var flag = true;
                var hasSameName = true;
                var isSon = true;


                var tableName = [];
                var hasName = [];
                this.table.map(item => {
                    tableName.push(item.name);
                    var cpFile = path.join(this.toSrc, item.name);
                    var isExist = fsExistsSync(cpFile)
                    if (isExist) {
                        flag = false;
                        hasName.push(item.name);
                    }
                })
                //检测表名是否有相同的
                var tableNameStr = JSON.stringify(tableName);
                tableName.map(item => {
                    if ((tableNameStr.match(new RegExp(item, "g")).length) > 1) {
                        hasSameName = false;
                    }
                })


                //判断生成目录是否是目标目录的子目录或与其是同目录
                var tag = /^\.\./;
                var inTarget = path.relative(this.targetSrc, this.toSrc);
                if (!tag.test(inTarget)) {
                    isSon = false;
                }


                //警告
                if (!hasSameName) {
                    ipc.send('open-error-dialog3')
                }

                if (!isSon) {
                    ipc.send('open-error-dialog4')
                }

                if (!flag) {
                    ipc.send('open-error-dialog2', hasName)
                }


                if (flag && hasSameName && isSon) {
                    var _self = this;
                    this.loading = true;

                    run([this.targetSrc, this.toSrc], this.table, function () {
                        _self.content = "处理完成"
                        _self.success = true;
                    }, function (err) {
                        _self.loading = false;
                        ipc.send('open-error-dialog1')
                    }, function (arr) {
                        _self.tipCont = arr;
                        _self.tipShow = true;
                    })
                }
            }

        },
        add(index) {
            this.table[index].data.push({
                target: '',
                content: ''
            })
        },
        remove(index, num) {
            this.table[index].data.splice(num, 1);

        },
        rm(index) {
            this.table.splice(index, 1);
        },
        addt() {
            this.table.push({
                name: '表' + (++this.addNum),
                data: [{
                    target: '',
                    content: ''
                }]
            })
        },
        close() {
            this.content = "处理中...";
            this.success = false;
            this.loading = false;
        },
        link() {
            shell.openExternal('https://github.com/modonglinaguadu/deal-office');
        }
    }
})

ipc.on('selected-directory', function (event, path, who) {
    if (who === 'target') {
        app.targetSelected = true;
        app.targetSrc = `${path}`;
    } else if (who === 'to') {
        app.toSelected = true;
        app.toSrc = `${path}`;
    }
})


function fsExistsSync(path) {
    try {
        fs.accessSync(path, fs.F_OK);
    } catch (e) {
        return false;
    }
    return true;
}