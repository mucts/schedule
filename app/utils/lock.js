function Lock() {
    this.lockMap = {};
    this.checkLocks = function (key) {
        const that = this;
        setImmediate(function () {
            if (key in that.lockMap) {
                let lockInfo = that.lockMap[key];
                if (lockInfo.isLocked) {
                    // 此key已经被上锁，不做操作
                } else {
                    if (lockInfo.callbacks.length === 0) {
                        // 锁队列大小为0，不做操作
                        delete that.lockMap[key];
                        return;
                    }
                    // 上锁
                    lockInfo.isLocked = true;
                    let callback = lockInfo.callbacks.shift();
                    callback(function () {
                        lockInfo.isLocked = false;
                        // 释放了锁，检查下一个
                        that.checkLocks(key);
                    });
                }
            }
        });
    };
}

/**
 * 请求加锁
 * @param key 锁队列ID
 * @param callback 获得锁之后的回调方法
 *
 * 注意：回调方法传入的参数为释放锁，在适当的地方必须释放锁！否则其他方法不能获得锁，将永远得不到执行
 */
Lock.prototype.requireLock = function (key, callback) {
    let lockInfo;
    if (key in this.lockMap) {
        lockInfo = this.lockMap[key];
    } else {
        lockInfo = {
            isLocked: false,
            callbacks: []
        };
        this.lockMap[key] = lockInfo;
    }
    // 添加到回调队列
    lockInfo.callbacks.push(callback);

    // 检查锁！
    this.checkLocks(key);
};

module.exports = Lock;