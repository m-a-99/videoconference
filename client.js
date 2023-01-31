let room = window.location.pathname.split('/')[1];
let socket = io("/", { query: { room: room }, autoConnect: false });
let local_midea;
let display_media = null;
let webcam_conns = {};
let screenshared = false;
let screen_conns = {};


navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(async (stream) => {
    const localStreamElem = document.createElement('video');
    localStreamElem.classList.add("flip")
    localStreamElem.srcObject = stream;
    localStreamElem.onloadedmetadata = e => {
        localStreamElem.play()
    };
    localStreamElem.muted = true;
    document.querySelector('#remoteStreams').appendChild(localStreamElem);
    local_midea = stream;
    // socket.connect()
})

socket.on("connect", async () => {
    console.log("myid: " + socket.id)
})

socket.on("confirm join",(id)=>{
    if(confirm(id+" ask to join")){
        socket.emit("accept join",id)
    }else{
        socket.emit("deny join",id)
    }
})

socket.on("peer connect",async(id)=>{
    console.log("webcam_conns[id]",id)
    webcam_conns[id] = await create_webcam_wrtc_Connection(id)
    screen_conns[id] = await create_screen_wrtc_Connection(id)
    socket.emit("be ready to get offer",id)
})

socket.on("be ready to get offer", async (id) => {
    webcam_conns[id] = await create_webcam_wrtc_Connection(id)
    screen_conns[id] = await create_screen_wrtc_Connection(id)
    socket.emit("ready to get offer", id)

})

socket.on("ready to get offer",async(id)=>{
    send_webcam_offer(id)
    send_screen_offer(id)
})


let webcam_streams = {}
async function create_webcam_wrtc_Connection(id) {
    var ICE_config = {
        'iceServers': [
            {
                'urls': 'stun:localhost:3478'
            }
            // {
            //     'urls': 'stun:stun1.l.google.com:19302'
            // },
            // {
            //     'urls': 'stun:vcall.co.vu:3478',             
            //     'username': 'root',
            //     'credential': '123456'
            // },
            // {
            //     'url': 'turn:192.158.29.39:3478?transport=udp',
            //     'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            //     'username': '28224511:1379330808'
            // },
            // {
            //     'url': 'turn:192.158.29.39:3478?transport=tcp',
            //     'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            //     'username': '28224511:1379330808'
            // }
            // {
            //     'urls': 'turn:vcall.co.vu:3478',
            //     'username': 'root',
            //     'credential': '123456'
            // }


        ]
    }
    wrtc_conn = new RTCPeerConnection(ICE_config);

    if (local_midea) {
        for (const track of local_midea.getTracks()) {
            wrtc_conn.addTrack(track);
        }
    }

    wrtc_conn.ontrack = (ev) => {
        let ss = webcam_streams[id]
        if (!ss) {
            let newRemoteStreamElem = document.createElement('video');
            newRemoteStreamElem.setAttribute("id", id)
            newRemoteStreamElem.classList.add(id + "webcam")
            newRemoteStreamElem.classList.add(id)
            newRemoteStreamElem.classList.add("flip")
            webcam_streams[id] = new MediaStream()
            webcam_streams[id].addTrack(ev.track)
            document.querySelector('#remoteStreams').appendChild(newRemoteStreamElem);
            newRemoteStreamElem.srcObject = webcam_streams[id];
            newRemoteStreamElem.onloadedmetadata = e => {
                newRemoteStreamElem.play()
            };
        }
        else {
            ss.addTrack(ev.track)
            delete webcam_streams[id];
        }
    };


    wrtc_conn.onicecandidate = function (event) {
        if (event.candidate) {
            console.log(" send screen candidate")
            socket.emit("candidate", event.candidate, id, "webcam")
        }
    };
    return wrtc_conn;
}



async function create_screen_wrtc_Connection(id) {
    var ICE_config = {
        'iceServers': [
            // {
            //     'urls': 'stun:127.0.0.1:3478'
            // }
            {
                'urls': 'stun:stun1.l.google.com:19302'
            },
            // {
            //     'urls': 'stun:vcall.co.vu:3478',             
            //     'username': 'root',
            //     'credential': '123456'
            // },
            // {
            //     'url': 'turn:192.158.29.39:3478?transport=udp',
            //     'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            //     'username': '28224511:1379330808'
            // },
            // {
            //     'url': 'turn:192.158.29.39:3478?transport=tcp',
            //     'credential': 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
            //     'username': '28224511:1379330808'
            // }
            // {
            //     'urls': 'turn:vcall.co.vu:3478',
            //     'username': 'root',
            //     'credential': '123456'
            // }


        ]
    }
    wrtc_conn = new RTCPeerConnection(ICE_config);

    if (display_media) {
        console.log('qqqqqqqqqqqq')
        for (const track of display_media.getTracks()) {
            console.log(track)
            wrtc_conn.addTrack(track);
        }
    }

    wrtc_conn.ontrack = (ev) => {
        let newRemoteStreamElem = document.createElement('video');
        newRemoteStreamElem.addEventListener("dblclick", () => {
            goFullscreen(newRemoteStreamElem)
        })
        newRemoteStreamElem.classList.add(id + "screenshare")
        newRemoteStreamElem.classList.add(id)
        let mstream = new MediaStream();
        mstream.addTrack(ev.track)
        document.querySelector('#remoteStreams').appendChild(newRemoteStreamElem);
        newRemoteStreamElem.srcObject = mstream
        newRemoteStreamElem.onloadedmetadata = e => {
            newRemoteStreamElem.play()
        };
    };


    wrtc_conn.onicecandidate = function (event) {
        if (event.candidate) {
            socket.emit("candidate", event.candidate, id, "screen")
        }
    };
    return wrtc_conn;
}


function send_screen_offer(id) {
    screen_conns[id].createOffer({ "iceRestart": true }).then(offer => {
        screen_conns[id].setLocalDescription(offer);
        socket.emit("offer", offer, id, "screen")
        console.log("send offer to " + id)
    }, error => {
        alert("Error when creating an offer");
    });

}
function send_webcam_offer(id) {
    console.log(webcam_conns[id])
    webcam_conns[id].createOffer({ "iceRestart": true }).then(offer => {
        webcam_conns[id].setLocalDescription(offer);
        socket.emit("offer", offer, id, "webcam")
        console.log("send offer to " + id)
    }, error => {
        alert("Error when creating an offer");
    });
}


socket.on("candidate", (candidate, id, type) => {
    if (type === "webcam") {
        webcam_conns[id].addIceCandidate(new RTCIceCandidate(candidate));
        console.log("got webcam cand", candidate)
    }
    else if (type === "screen") {
        screen_conns[id].addIceCandidate(new RTCIceCandidate(candidate));
        console.log("got screen cand", candidate)
    }


})

socket.on("offer", (offer, id, type) => {
    if (type === "webcam") {
        console.log("get webcam offer from " + id)
        webcam_conns[id].setRemoteDescription(new RTCSessionDescription(offer));
        webcam_conns[id].createAnswer(answer => {
            webcam_conns[id].setLocalDescription(answer);
            socket.emit("answer", answer, id, "webcam")
        }, error => {
            alert("Error when creating an answer");
        });
    }
    else if (type === "screen") {
        console.log("get screen offer from " + id)
        screen_conns[id].setRemoteDescription(new RTCSessionDescription(offer));
        screen_conns[id].createAnswer(answer => {
            screen_conns[id].setLocalDescription(answer);
            socket.emit("answer", answer, id, "screen")
        }, error => {
            alert("Error when creating an answer");
        });
    }
})


socket.on("answer", (answer, id, type) => {

    if (type === "webcam") {
        console.log("getanswer webcam from " + id)
        webcam_conns[id].setRemoteDescription(new RTCSessionDescription(answer));
        
    }
    else if (type === "screen") {
        console.log("getanswer screen from " + id)
        screen_conns[id].setRemoteDescription(new RTCSessionDescription(answer));
        socket.emit("answer done",id)
    }
})

socket.on("leave", (id) => {
    let elements = document.querySelectorAll("." + id)
    elements.forEach(e => e.remove())
    webcam_conns[id].close();
    screen_conns[id].close()
    delete webcam_conns[id]
    delete screen_conns[id]
    console.log(id + " has left")

})

socket.on("stop screenshare", id => {
    let elements = document.querySelectorAll("." + id + "screenshare");
    elements.forEach(e => e.remove());
})


async function share_screen1() {
    try {
        let dstream = await navigator.mediaDevices.getDisplayMedia({ cursor: true })
        dstream.getTracks()[0].onended = stop_screenshare

        display_media = dstream;
        if (!screenshared) {
            const localStreamElem2 = document.createElement('video');
            localStreamElem2.addEventListener("dblclick", () => {
                goFullscreen(localStreamElem2)
            })
            localStreamElem2.classList.add("myscreenshare")
            localStreamElem2.srcObject = dstream;
            localStreamElem2.onloadedmetadata = e => {
                localStreamElem2.play()
            };
            localStreamElem2.muted = true;
            document.querySelector('#remoteStreams').appendChild(localStreamElem2);
        }


        for (const c in screen_conns) {
            screen_conns[c].addTrack(dstream.getTracks()[0])
        }
        for (const c in screen_conns) {
            send_screen_offer(c);
        }
        screenshared = true

    }
    catch (e) {
        console.log(e)
    }
     }

    function toggle_webcam() {
        let tracks = local_midea.getTracks()
        if (tracks[1].enabled) {
            tracks[1].enabled = false

        }
        else {
            tracks[1].enabled = true

        }
    }
    function toggle_mic() {
        let tracks = local_midea.getTracks()
        if (tracks[0].enabled) {
            tracks[0].enabled = false

        }
        else {
            tracks[0].enabled = true

        }

    }
    function stop_screenshare(event) {
        let elements = document.querySelectorAll(".myscreenshare");
        elements.forEach(e => e.remove());
        screenshared = false
        socket.emit("stop screenshare")
        display_media = null;
    }

    function toggle_screenshare() {
        if (!screenshared) {
            share_screen1()
        }
        else {
            display_media.getTracks()[0].stop()
            stop_screenshare()
        }

    }

    function join(element) {
        socket.connect()
        element.style.display = 'none';

    }

    function goFullscreen(element) {
        if (element.mozRequestFullScreen) {
            element.mozRequestFullScreen();
        } else if (element.webkitRequestFullScreen) {
            element.webkitRequestFullScreen();
        }
        console.log("full")
    }
