import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Order "mo:core/Order";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Char "mo:core/Char";
import Random "mo:core/Random";



actor {
  type Score = {
    player : Text;
    score : Nat;
  };

  module Score {
    public func compare(score1 : Score, score2 : Score) : Order.Order {
      switch (Nat.compare(score2.score, score1.score)) {
        case (#equal) { Text.compare(score1.player, score2.player) };
        case (order) { order };
      };
    };
  };

  let scores = Map.empty<Text, Score>();

  public shared ({ caller }) func submitScore(player : Text, score : Nat) : async () {
    let newScore : Score = {
      player;
      score;
    };
    scores.add(player, newScore);
  };

  public query ({ caller }) func getTopScores() : async [Score] {
    scores.values().toArray().sort().sliceToArray(0, Nat.min(10, scores.size()));
  };

  type RoomGameState = {
    runs1 : Nat;
    wickets1 : Nat;
    balls1 : Nat;
    overs1 : Nat;
    runs2 : Nat;
    wickets2 : Nat;
    balls2 : Nat;
    overs2 : Nat;
    currentInnings : Nat;
    ballState : Text;
    lastEvent : Text;
    gameOver : Bool;
    inningsBreak : Bool;
  };

  type Room = {
    code : Text;
    maxOvers : Nat;
    player1Joined : Bool;
    player2Joined : Bool;
    phase : Text;
    state : RoomGameState;
  };

  let rooms = Map.empty<Text, Room>();

  func generateRoomCode() : async Text {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".toArray();
    var code = "";
    for (i in Nat.range(0, 6)) {
      let idx = await Random.natRange(0, chars.size());
      let c = chars[idx];
      code #= c.toText();
    };
    code;
  };

  public shared ({ caller }) func createRoom(maxOvers : Nat) : async Text {
    let code = await generateRoomCode();
    let newRoom : Room = {
      code;
      maxOvers;
      player1Joined = true;
      player2Joined = false;
      phase = "waiting";
      state = {
        runs1 = 0;
        wickets1 = 0;
        balls1 = 0;
        overs1 = 0;
        runs2 = 0;
        wickets2 = 0;
        balls2 = 0;
        overs2 = 0;
        currentInnings = 1;
        ballState = "waiting";
        lastEvent = "";
        gameOver = false;
        inningsBreak = false;
      };
    };
    rooms.add(code, newRoom);
    code;
  };

  public shared ({ caller }) func joinRoom(code : Text) : async Bool {
    switch (rooms.get(code)) {
      case (null) { false };
      case (?room) {
        if (room.player2Joined) { return false };
        let updatedRoom : Room = {
          code = room.code;
          maxOvers = room.maxOvers;
          player1Joined = room.player1Joined;
          player2Joined = true;
          phase = "playing";
          state = room.state;
        };
        rooms.add(code, updatedRoom);
        true;
      };
    };
  };

  public query ({ caller }) func getRoom(code : Text) : async ?Room {
    rooms.get(code);
  };

  public shared ({ caller }) func updateRoomState(code : Text, state : RoomGameState) : async Bool {
    switch (rooms.get(code)) {
      case (null) { false };
      case (?room) {
        let updatedRoom : Room = {
          code = room.code;
          maxOvers = room.maxOvers;
          player1Joined = room.player1Joined;
          player2Joined = room.player2Joined;
          phase = if (state.gameOver) { "finished" } else { room.phase };
          state;
        };
        rooms.add(code, updatedRoom);
        true;
      };
    };
  };

  public shared ({ caller }) func quickMatch() : async Text {
    let openRooms : [Text] = rooms.entries().filter(func((code, room)) { not room.player2Joined and room.phase == "waiting" }).map(func((code, _room)) { code }).toArray();
    if (openRooms.size() > 0) { return openRooms[0] };
    let code = await generateRoomCode();
    let newRoom : Room = {
      code;
      maxOvers = 5;
      player1Joined = true;
      player2Joined = false;
      phase = "waiting";
      state = {
        runs1 = 0;
        wickets1 = 0;
        balls1 = 0;
        overs1 = 0;
        runs2 = 0;
        wickets2 = 0;
        balls2 = 0;
        overs2 = 0;
        currentInnings = 1;
        ballState = "waiting";
        lastEvent = "";
        gameOver = false;
        inningsBreak = false;
      };
    };
    rooms.add(code, newRoom);
    code;
  };

  public query ({ caller }) func listOpenRooms() : async [Text] {
    rooms.entries().filter(func((code, room)) { not room.player2Joined and room.phase == "waiting" }).map(func((code, _room)) { code }).toArray();
  };
};

