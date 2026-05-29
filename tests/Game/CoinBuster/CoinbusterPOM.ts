export const CoinBusterObjects = {
  HomeScreen: {
    tryOrPlayButton: {
      path: "stage.children[0].children[0].children[14].children[3].children[3]"
    }
  },

  ticketCostScreen: {
    increasePrice: {
      path: "stage.children[0].children[0].children[15].children[4].children[3]"
    },
    decreasePrice: {
      path: "stage.children[0].children[0].children[15].children[5].children[3]"
    },
    tryOrPlayButton: {
      path: "stage.children[0].children[0].children[15].children[3].children[3]"
    }
  },

  progressGo: {
    main: {
      path: "stage.children[0].children[0].children[7].children[4]"
    },
    bonusContinue: {
      path: "stage.children[0].children[0].children[16].children[8].children[3]",
    },


  },
   resultScreen: {
    tryOrPlayAgain: {
      path: "stage.children[0].children[0].children[22].children[6].children[3]"
    },
    changeCost: {
      path: "stage.children[0].children[0].children[22].children[5].children[1]"
    }
  },

  bonusSafeScreen: {
    safe: {
      path: "stage.children[0].children[0].children[11].children[2].children[1]"
    }
  },

 
  bonusPickScreen: {
    piggyBank0: {
      path: "stage.children[0].children[0].children[10].children[2].children[0].children[0].children[2]"
    },

    piggyBank1: {
      path: "stage.children[0].children[0].children[10].children[2].children[1].children[0].children[2]"
    },

    piggyBank2: {
      path: "stage.children[0].children[0].children[10].children[2].children[2].children[0].children[2]"
    }
  },
  
match3Screen: {
    basePath: "stage.children[0].children[0].children[13].children[3]",

    getCellPath(index: number) {
      return `${this.basePath}.children[${index}].children[9]`;
    },

    gridIndex: {
      row1: [0, 1, 2],
      row2: [3, 4, 5],
      row3: [6, 7, 8],
      row4: [9, 10, 11]
    }
  },
  
    bonusWheelScreen: {
    goButton: {
      path: "stage.children[0].children[0].children[12].children[2].children[6].children[4]"
    }
  }


};
export default CoinBusterObjects;
