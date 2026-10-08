HOLE = 7
IR_PIN = DigitalPin.P1
IR_DETECTED = 0
TRIG_PIN = DigitalPin.P0
ECHO_PIN = DigitalPin.P2

START_DISTANCE_CM = 15
CLEAR_DISTANCE_CM = 25

start_time = 0
playing = False
sonar_armed = False
near_count = 0
clear_count = 0
next_start_time = 0

radio.set_group(42)
serial.redirect_to_usb()
serial.set_baud_rate(BaudRate.BAUD_RATE115200)

# Free P0 for sonar; the built-in speaker remains available.
pins.set_audio_pin_enabled(False)
pins.set_pull(IR_PIN, PinPullMode.PULL_UP)
pins.set_pull(ECHO_PIN, PinPullMode.PULL_NONE)
pins.digital_write_pin(TRIG_PIN, 0)


def send(msg: str):
    for index in range(3):
        radio.send_string(msg)
        basic.pause(50)


def distance_cm():
    pins.digital_write_pin(TRIG_PIN, 0)
    control.wait_micros(2)
    pins.digital_write_pin(TRIG_PIN, 1)
    control.wait_micros(10)
    pins.digital_write_pin(TRIG_PIN, 0)

    duration = pins.pulse_in(ECHO_PIN, PulseValue.HIGH, 25000)
    if duration == 0:
        return -1
    return duration / 58


def start():
    global start_time, playing, sonar_armed, near_count
    if playing or input.running_time() < next_start_time:
        return
    # Clear the finish sensor before starting.
    if pins.digital_read_pin(IR_PIN) == IR_DETECTED:
        return

    start_time = input.running_time()
    playing = True
    sonar_armed = False
    near_count = 0
    serial.write_line("START")
    send("START " + str(HOLE))


def finish():
    global playing, sonar_armed, clear_count, near_count
    global next_start_time
    if playing:
        playing = False
        sonar_armed = False
        clear_count = 0
        near_count = 0
        next_start_time = input.running_time() + 2000
        secs = Math.round((input.running_time() - start_time) / 1000)
        serial.write_line("FINISH")
        send("FINISH " + str(HOLE) + " " + str(secs))


def on_button_pressed_a():
    start()
input.on_button_pressed(Button.A, on_button_pressed_a)


def on_button_pressed_b():
    finish()
input.on_button_pressed(Button.B, on_button_pressed_b)


def on_forever():
    global sonar_armed, near_count, clear_count

    if playing:
        if pins.digital_read_pin(IR_PIN) == IR_DETECTED:
            finish()
    elif input.running_time() >= next_start_time:
        if pins.digital_read_pin(IR_PIN) == IR_DETECTED:
            sonar_armed = False
            clear_count = 0
            near_count = 0
        else:
            cm = distance_cm()

            # Arm after three clear readings.
            if cm < 0 or cm > CLEAR_DISTANCE_CM:
                clear_count += 1
                near_count = 0
                if clear_count >= 3:
                    sonar_armed = True
            else:
                clear_count = 0
                if sonar_armed and cm >= 5 and cm <= START_DISTANCE_CM:
                    near_count += 1
                    if near_count >= 3:
                        start()
                else:
                    near_count = 0

    basic.pause(100)
basic.forever(on_forever)
