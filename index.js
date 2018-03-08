const {
    app,
    BrowserWindow
} = require('electron')
const path = require('path')
const url = require('url')


const ipc = require('electron').ipcMain;
const dialog = require('electron').dialog;




// 保持一个对于 window 对象的全局引用，如果你不这样做，
// 当 JavaScript 对象被垃圾回收， window 会被自动地关闭
let win

function createWindow() {
    // 创建浏览器窗口。
    win = new BrowserWindow({
        width: 800,
        height: 600
    })

    // 然后加载应用的 index.html。
    win.loadURL(url.format({
        pathname: path.join(__dirname, 'index.html'),
        protocol: 'file:',
        slashes: true
    }))

    // 打开开发者工具。
    win.webContents.openDevTools()

    // 当 window 被关闭，这个事件会被触发。
    win.on('closed', () => {
        // 取消引用 window 对象，如果你的应用支持多窗口的话，
        // 通常会把多个 window 对象存放在一个数组里面，
        // 与此同时，你应该删除相应的元素。
        win = null
    })

}

// Electron 会在初始化后并准备
// 创建浏览器窗口时，调用这个函数。
// 部分 API 在 ready 事件触发后才能使用。
app.on('ready', createWindow)

// 当全部窗口关闭时退出。
app.on('window-all-closed', () => {
    // 在 macOS 上，除非用户用 Cmd + Q 确定地退出，
    // 否则绝大部分应用及其菜单栏会保持激活。
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => {
    // 在macOS上，当单击dock图标并且没有其他窗口打开时，
    // 通常在应用程序中重新创建一个窗口。
    if (win === null) {
        createWindow()
    }


})


ipc.on('open-file-dialog', function (event, who) {
    dialog.showOpenDialog({
        properties: ['openFile', 'openDirectory']
    }, function (files) {
        if (files) event.sender.send('selected-directory', files, who)
    })
})



ipc.on('open-error-dialog', function (event) {
    dialog.showErrorBox('错误', '您未选择目标文件夹或生成文件夹，请选择！')
})

ipc.on('open-error-dialog1', function (event) {
    dialog.showErrorBox('处理失败', '请删除目标文件夹文件，并重新启动程序再试运行，如若失败，请联系作者或github提交issue')
})

ipc.on('open-error-dialog2', function (event, arr) {
    var str = arr.join(',');
    dialog.showErrorBox('错误', '目标文件夹中已存在 [ ' + str + ' ]文件夹,请更换表名或更换目标文件夹')
})

ipc.on('open-error-dialog3', function (event) {
    dialog.showErrorBox('表名错误', '表名不能有相同的')
})

ipc.on('open-error-dialog4', function (event) {
    dialog.showErrorBox('文件夹错误', '生成文件夹不能是目标文件夹的子文件夹或同文件夹')
})


ipc.on('open-information-dialog', function (event, arr) {
    const options = {
        type: 'info',
        title: '警告',
        message: '您选的文件夹中含有.doc或.xls文件,现系统不支持处理该类文件，您是否去修改?',
        buttons: ['是,去修改', '忽略，继续执行']
    }
    dialog.showMessageBox(options, function (index) {
        event.sender.send('information-dialog-selection', index)
    })
})