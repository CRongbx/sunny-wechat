var util = require('../../../utils/util.js');
var app = getApp()
var temp = []
var serviceId = "00002A00-0000-1000-8000-00805F9B34FB"
var characteristicId = "00002A00-0000-1000-8000-00805F9B34FB"

Page({
  data: {
    //小程序总是会读取data对象来做数据绑定，这个动作我们称为动作A
    //而这个动作A的执行，是在onLoad事件执行之后发生的
    isbluetoothready: false,
    defaultSize: 'default',
    primarySize: 'default',
    warnSize: 'default',
    disabled: false,
    plain: false,
    loading: false,
    searchingstatus: false,
    receivedata: '',
    onreceiving: false
  },

  onLoad: function(options) {
    this.getLocation();
    this.getTime();

    var isPowerOn = wx.getStorageSync('is_power_on');
    if (isPowerOn) {
      this.setData({
        isPowerOn: isPowerOn
      });
    } else {
      isPowerOn = true;
      wx.setStorageSync('is_power_on', isPowerOn);
    }
  },

  getLocation: function() {
    var that = this;
    wx.getLocation({
      type: 'wgs84',
      /*返回 GPS 坐标*/
      success: function(res) {
        that.setData({
          latitude: res.latitude,
          /*浮点数，范围为-90~90，负数表示南纬 */
          longitude: res.longitude,
          /*浮点数，范围为-180~180，负数表示西经 */
        });
      }
    });
  },

  getTime: function() {
    var time = util.formatTime(new Date());
    var year = util.getYear(new Date());
    var month = util.getMonth(new Date());
    var day = util.getDay(new Date());
    var hour = util.getHour(new Date());
    var minute = util.getMinute(new Date());
    this.setData({
      time: time,
      year: year,
      month: month,
      day: day,
      hour: hour,
      minute: minute,
    });
  },

  onPullDownRefresh: function() {
    wx.showNavigationBarLoading() // 在标题栏中显示加载

    //重新加载获取位置
    this.getLocation();
    setTimeout(function() {
      //complete
      wx.hideNavigationBarLoading() //完成后停止加载
      wx.stopPullDownRefresh() //停止下拉刷新
    }, 1500);
  },

  onPowerTap: function(event) {
    var isPowerOn = wx.getStorageSync('is_power_on');
    //开变关，关变开
    isPowerOn = !isPowerOn;
    this.showToast(isPowerOn);
  },

  showToast: function(isPowerOn) {
    wx.setStorageSync('is_power_on', isPowerOn);
    this.setData({
      isPowerOn: isPowerOn
    });
    wx.showToast({
      title: isPowerOn ? "关闭向阳伞" : "开启向阳伞",
      duration: 1000,
      icon: "success",
    })
  },

  onRefreshTap: function(event) {
    this.getLocation();
    this.getTime();
    wx.showToast({
      title: "刷新",
      duration: 1000,
      icon: "loading",
    })
  },

  /*******************************************************************************
   * 以下是蓝牙模块
   ********************************************************************************/
  switchBlueTooth: function() {
    // 蓝牙状态改变
    var that = this;
    that.setData({
      isbluetoothready: !that.data.isbluetoothready,
    })

    if (that.data.isbluetoothready) {
      // 开蓝牙
      wx.openBluetoothAdapter({
        // 开启蓝牙适配器
        success: function(res) {
          console.log("初始化蓝牙适配器成功")
          wx.onBluetoothAdapterStateChange(function(res) {
            // 监听蓝牙适配器状态改变
            console.log("蓝牙适配器状态发生变化", res)
            that.setData({
              isbuletoothready: res.available,
              searchingstatus: res.discovering
            })
          })
          wx.onBluetoothDeviceFound(function(devices) {
            // 监听寻找新设备
            console.log("onBluetoothDeviceFound", devices)
            temp.push(devices)
            that.setData({
              devices: temp
            })
            console.log("发现新的蓝牙设备")
            console.log("设备id:" + devices.devices[0].deviceId)
            console.log("设备name:" + devices.devices[0].name)
          }) //onBluetoothDeviceFound
        }, //openBluetoothAdapter success
        fail: function(res) {
          console.log("初始化蓝牙适配器失败")
          wx.showModal({
            title: '提示',
            content: '请检查手机蓝牙是否打开',
            success: function(res) {
              that.setData({
                isbluetoothready: false,
                searchingstatus: false
              })
            }
          }) //showModal
        } //openBluetoothAdapter fail
      }) //openBluetoothAdapter
    } else {
      // 关蓝牙
      temp = []
      wx.closeBLEConnection({
        // 断开蓝牙连接
        deviceId: that.data.connectedDeviceId,
        complete: function(res) {
          console.log(res)
          that.setData({
            deviceconnected: false,
            connectedDeviceId: ""
          })
        } //complete
      }) //closeBLEConnection
      wx.closeBluetoothAdapter({
        // 关闭蓝牙适配器
        success: function(res) {
          console.log(res)
          that.setData({
            isbluetoothready: false,
            deviceconnected: false,
            devices: [],
            searchingstatus: false,
            receivedata: ''
          })
        }, //success
        fail: function(res) {
          wx.showModal({
            title: '提示',
            content: '请检查手机蓝牙是否打开',
            success: function(res) {
              that.setData({
                isbluetoothready: false
              })
            }
          })
        } //fail
      }) //closeBluetoothAdapter
    }
  },

  searchbluetooth: function() {
    temp = [];
    var that = this;
    if (!that.data.searchingstatus) {
      var that = this;
      wx.startBluetoothDevicesDiscovery({
        success: function(res) {
          console.log("开始搜索附近蓝牙设备");
          console.log(res);
          that.setData({
            searchingstatus: !that.data.searchingstatus
          })
        }
      })
    } else {
      wx.stopBluetoothDevicesDiscovery({
        success: function(res) {
          console.log("停止搜索附近蓝牙设备");
          console.log(res);
        },
      })
    } //else
  },

  connectTO: function(event) {
    var that = this;

    if (that.data.deviceconnected) {
      wx.notifyBLECharacteristicValueChange({
        //停用低功耗蓝牙设备特征值变化时的 notify 功能
        deviceId: that.data.connectedDeviceId,
        serviceId: serviceId,
        characteristicId: characteristicId,
        state: false,
        success: function(res) {
          console.log("停用notify功能");
        },
      })
      wx.closeBLEConnection({
        deviceId: event.currentTarget.id,
        complete: function(res) {
          console.log("断开设备")
          console.log(res);
          //清空data
          that.setData({
            deviceconnected: false,
            connectedDeviceId: "",
            receivedata: ""
          })
        }
      })
    } else {
      wx.showLoading({
        title: '蓝牙设备连接中...',
      })
      wx.createBLEConnection({
        deviceId: event.currentTarget.id,
        success: function(res) {
          wx.hideLoading()
          wx.showToast({
            title: '连接成功',
            icon: 'succsee',
            duration: 2000
          })
          console.log("设备连接成功")
          console.log(res)
          that.setData({
            deviceconnected: true,
            connectedDeviceId: event.currentTarget.id
          })

          wx.notifyBLECharacteristicValueChange({
            deviceId: that.data.connectedDeviceId,
            serviceId: serviceId,
            characteristicId: characteristicId,
            state: true,
            success: function(res) {
              console.log("启用notify")
            },
          })
        }, //success
        fail: function(res) {
          wx.hideLoading()
          wx.showToast({
            title: '设备连接失败',
            duration: 2000
          })
          console.log("设备连接失败")
          console.log(res)
          that.setData({
            connected: false
          })
        } //fail
      }) //createBLEConnection
      wx.stopBluetoothDevicesDiscovery({
        success: function(res) {
          console.log("停止蓝牙搜索")
          console.log(res)
        },
      })
    } //else
  },

  formSubmit: function(event) {
    console.log("form发生了submit事件，携带数据：", event.detail.value.senddata)
    var senddata = event.detail.value.senddata;
    var that = this;
    let buffer = new ArrayBuffer(senddata.length)
    let dataView = new DataView(buffer)
    for (var i = 0; i < senddata.length; i++) {
      dataView.setUint8(i, senddata.charAt(i).charCodeAt())
    }
    wx.writeBLECharacteristicValue({
      //向蓝牙设备写入数据
      deviceId: that.data.connectedDeviceId,
      serviceId: serviceId,
      characteristicId: characteristicId,
      value: buffer,
      success: function(res) {
        console.log(res)
        console.log('writeBLECharacteristicValue success!', res.errMsg)
      }
    })
  },

  formReset: function() {
    console.log("form 发生了reset事件")
  }
})

function getNowFormatData() {
  var date = new Date();
  var seperator1 = "-";
  var seperator2 = ":";
  var month = date.getMonth() + 1;
  var strDate = date.getDate();
  if (month >= 1 && month <= 9) {
    month = "0" + month;
  }
  if (strDate >= 0 && strDate <= 9) {
    strDate = "0" + strDate;
  }
  var currentdate = date.getFullYear() + seperator1 + month + seperator1 + strDate + " " + date.getHours() + seperator2 + date.getMinutes() + seperator2 + date.getSeconds();
  
  return currentdate;
}