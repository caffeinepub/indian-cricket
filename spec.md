# Indian Cricket Game

## Current State
Version 12 is live with:
- Three.js/R3F 3D cricket game with stadium, pitch, crowd
- Humanoid player models (batsman, bowler, umpire, fielders) with cricket gear
- Real India vs Australia player squads
- WCC3-style compact HUD (batting card, bowling card, fielding radar)
- Batting: timing meter, Front Foot/Back Foot/Advance/Leave, Push/Stroke/Loft (Loft = air shot)
- Bowling: Pacer/Spinner with variants (Swing, Yorker, Bouncer, Off-Spin, Leg-Spin)
- Cinematic broadcast camera with delivery zoom and follow-ball
- Slow-motion replay on boundaries/wickets
- Team Editor with gear color pickers and face texture upload slot
- Local multiplayer (P1 bowls, P2 bats, swap innings)
- Online multiplayer lobby (Quick Match / Play with Friends)
- Day/Night mode toggle
- Canvas-generated grass texture with mowing stripes

## Requested Changes (Diff)

### Add
- Ball-trail motion blur effect (streak behind the ball during flight)
- Pitch impact dust puff particle effect on ball bounce
- Difficulty selector (Easy/Medium/Hard) affecting fielder speed, timing window, AI bowling variation
- Match statistics screen (runs per over, highest scorer, bowling figures)
- Jersey numbers floating above each 3D player model
- Better humanoid geometry: more anatomically correct proportions, visible shorts, better helmets

### Modify
- Improve batting controls layout — make them even more compact (bottom strip, one row)
- Controls show only when needed (batting controls appear only when ball is bowled, bowling controls only when setting up)
- Improve player rendering: distinct shorts vs top, visible pads, helmet with grill
- Improve loft shot visual — ball arcs higher, camera follows the arc
- More realistic ball physics with proper bounce height variation based on pitch length

### Remove
- Nothing to remove

## Implementation Plan
1. Add ball-trail using Points/Line geometry that tracks last N ball positions
2. Add dust puff: simple expanding ring of particles at bounce point, fades quickly
3. Add difficulty UI panel (3 buttons: Easy/Medium/Hard) accessible from main HUD
4. Add match stats modal (table of batsmen scores + bowling figures)
5. Jersey number sprites above each fielder/batsman/bowler head
6. Refine player geometries for more human proportions with visible shorts and gear
7. Consolidate batting/bowling control panels to single-row compact strips
8. Camera arc tracking for loft shots
