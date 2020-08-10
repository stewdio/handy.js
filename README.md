![Handy.js](./media/vr-hands.gif "Handy.js")  


Handy.js
========================================================================
👋 Ahoy.  
  
Handy makes defining and using custom hand shapes in WebXR a snap.
Just name your hand shape (eg. “pinch”)
and write a function that defines the shape.
Handy will create and update convenience booleans
that you can query in your update loop,
and it will create custom events that you can listen for.  
  
**Demo**.
Make your hand into a “finger gun” shape
then tap your thumb down 
onto your middle finger
to shoot lasers from your hand.
Make a fist to cycle through different hand model styles.
“Devil horns” toggle the hand-specific colors.  
  
**Requirements**.
This code has been designed for the Oculus Quest.
You’ll need to follow these steps before you can 
experience the demo yourself:  
  
1. In Oculus **settings**
enable automatic switching between regular hand controlles
and bare hands.

2. In the Oculus **browser**
visit [chrome://flags/](chrome://flags/).

3. Within the flags page, **enable** the 
“WebXR experiences with joints tracking” flag
(`#webxr-hands`).

4. Within the flags page, **disable** 
the “WebXR experiences with hands tracking” flag
(`#webxr-hands-tracking`).
Yes. _Disable_ it.
We’re at that funny early stage of the technology where 
things are not always what they seem.

5. Restart the Oculus browser
and visit this site again.
Use your hand controllers 
to click the “Enter VR” button.
Once you are inside the experience put your controllers down,
hold your hands out in front of you 
so that the headset can see them,
and enjoy! 😄  
  
  
  
I’m [Stewart](https://stewartsmith.io).
This demo illustrates the use of the
[WebXR device hand input API](https://github.com/immersive-web/webxr-hand-input/blob/master/explainer.md)
for hand and finger tracking,
as tested on an
[Oculus Quest](https://www.oculus.com/quest/)
stand-alone headset.
This experience is live at 
[https://stewartsmith.io/handy/](https://stewartsmith.io/handy/).
This code is open-source and available at
[https://github.com/stewdio/handy.js](https://github.com/stewdio/handy.js).  
  
  



