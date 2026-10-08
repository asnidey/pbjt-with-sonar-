function finish () {
    let secs: number;
if (playing) {
        playing = false
        sonar_armed = false
        clear_count = 0
        near_count = 0
        next_start_time = input.runningTime() + 2000
        secs = Math.round((input.runningTime() - start_time) / 1000)
        serial.writeLine("FINISH")
        send("FINISH " + ("" + HOLE) + " " + ("" + secs))
    }
}
input.onButtonPressed(Button.A, function () {
    start()
})
function distance_cm () {
    pins.digitalWritePin(TRIG_PIN, 0)
    control.waitMicros(2)
    pins.digitalWritePin(TRIG_PIN, 1)
    control.waitMicros(10)
    pins.digitalWritePin(TRIG_PIN, 0)
    let duration = pins.pulseIn(ECHO_PIN, PulseValue.High, 25000)
if (duration == 0) {
        return -1
    }
    return duration / 58
}
function send (msg: string) {
    for (let index = 0; index < 3; index++) {
        radio.sendString(msg)
        basic.pause(50)
    }
}
input.onButtonPressed(Button.B, function () {
    finish()
})
function start () {
    if (playing || input.runningTime() < next_start_time) {
        return
    }
    // Clear the finish sensor before starting.
    if (pins.digitalReadPin(IR_PIN) == IR_DETECTED) {
        return
    }
    start_time = input.runningTime()
    playing = true
    sonar_armed = false
    near_count = 0
    serial.writeLine("START")
    send("START " + ("" + HOLE))
}
let IR_DETECTED = 0
let start_time = 0
let next_start_time = 0
let near_count = 0
let clear_count = 0
let sonar_armed = false
let playing = false
let TRIG_PIN = 0
let IR_PIN = 0
let HOLE = 0
HOLE = 7
IR_PIN = DigitalPin.P1
TRIG_PIN = DigitalPin.P0
let ECHO_PIN = DigitalPin.P2
let START_DISTANCE_CM = 15
let CLEAR_DISTANCE_CM = 25
radio.setGroup(42)
serial.redirectToUSB()
serial.setBaudRate(BaudRate.BaudRate115200)
// Free P0 for sonar; the built-in speaker remains available.
pins.setAudioPinEnabled(false)
pins.setPull(IR_PIN, PinPullMode.PullUp)
pins.setPull(ECHO_PIN, PinPullMode.PullNone)
pins.digitalWritePin(TRIG_PIN, 0)
basic.forever(function () {
    let cm: number;
if (playing) {
        if (pins.digitalReadPin(IR_PIN) == IR_DETECTED) {
            finish()
        }
    } else if (input.runningTime() >= next_start_time) {
        if (pins.digitalReadPin(IR_PIN) == IR_DETECTED) {
            sonar_armed = false
            clear_count = 0
            near_count = 0
        } else {
            cm = distance_cm()
            // Arm after three clear readings.
            if (cm < 0 || cm > CLEAR_DISTANCE_CM) {
                clear_count += 1
                near_count = 0
                if (clear_count >= 3) {
                    sonar_armed = true
                }
            } else {
                clear_count = 0
                if (sonar_armed && cm >= 5 && cm <= START_DISTANCE_CM) {
                    near_count += 1
                    if (near_count >= 3) {
                        start()
                    }
                } else {
                    near_count = 0
                }
            }
        }
    }
    basic.pause(100)
})
