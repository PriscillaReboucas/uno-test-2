import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UnoContext } from "./UnoContext";
import parse from "html-react-parser";
import PickUpDeck from "./components/PickUpDeck";
import Table from "./components/Table";
import './Room.css'

const Room = () => {
  const navigate = useNavigate();
  const {
    socket,
    username,
    playingDeck,
    setPlayingDeck,
    deck,
    setDeck,
    userDataList,
    setUserDataList,
  } = useContext(UnoContext);

  useEffect(() => {
    socket.on("allUserData", (userData) => {
      setUserDataList(userData);
    });
  }, [username]);

  useEffect(() => {
    socket.on("initialDeck", (cards) => {
      setDeck(cards);
    });
    socket.on('playingDeck', (tableCards) => {
      setPlayingDeck(tableCards)
    })
  }, [userDataList]);

  const handleLeave = (e) => {
    e.preventDefault();
    navigate("/");
  };

  const handlePlayCard = (cards) => {
    const wildCard = cards.action;
    // console.log(!!wildCard, 'here is wildcard')
    if (!!wildCard){
      if((cards.color === playingDeck[0].color) || (wildCard === playingDeck[0].action)) {
        // console.log(playingDeck, 'playing deck here')
        // console.log(cards, 'here are the cards');
        console.log('inside wildcard if')
        const currentPlayer = userDataList.find((user) => user.id === username.id);
        const indexPlayer = userDataList.findIndex((user) => user.id === username.id);
        const cardIndex = currentPlayer.cards.findIndex((card) => card.id === cards.id);
        currentPlayer.cards.splice(cardIndex, 1);
        userDataList.splice(indexPlayer, 1, currentPlayer);
        playingDeck.unshift(cards);
        socket.emit('playCard', userDataList, playingDeck);
      } 
    }
    else if ((cards.color === playingDeck[0].color) || (cards.digit === playingDeck[0].digit)) {
      console.log('inside normal cards if')

        // console.log(playingDeck, 'playing deck here')
        // console.log(cards, 'here are the cards');
        const currentPlayer = userDataList.find((user) => user.id === username.id);
        const indexPlayer = userDataList.findIndex((user) => user.id === username.id);
        const cardIndex = currentPlayer.cards.findIndex((card) => card.id === cards.id);
        currentPlayer.cards.splice(cardIndex, 1);
        userDataList.splice(indexPlayer, 1, currentPlayer);
        playingDeck.unshift(cards);
        socket.emit('playCard', userDataList, playingDeck);
      }
  };


  if (userDataList.length !== 2){
    return (
      <section>
        <h2>Waiting for all players...</h2>
        {userDataList?.map((users) => <p key={users.id}>{users.player}</p>)}
      </section>
    )
  }
  else {
    return (
      <>
        {userDataList?.map((data) => {
          return (
            <div key={data.id}>
            <h3>Player: {data.player}</h3>
            <section className="card__hand--container">
              {data.cards.map((cards) => {
                return (
                  <article
                    key={cards.id}
                    onClick={() => handlePlayCard(cards)}
                    className="card__hand"
                    style={{ color: cards.color}}
                  >
                    {parse(cards.code)}
                  </article>
                );
              })}
            </section>
        </div>
          );
        })}
        <section>
          <PickUpDeck />
        </section>
        <section>
          <Table />
        </section>
        <section>
          <button onClick={handleLeave}>Leave Room</button>
        </section>
      </>
    );
  }
};

export default Room;
