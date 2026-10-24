import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import toast from "react-hot-toast";
import { useNavigate } from 'react-router-dom';

const Home = () => {


    const navigate = useNavigate();
    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');

    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidv4();
        console.log(id);
        setRoomId(id);
        toast.success('Created a new room');
    }

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error("Room Id and Username is required");
            return;
        }
        //Redirect

        navigate(`/editor/${roomId}`, {
            // here this data will pass through  naviagate to new page
            state: {
                username,
            },
        })

    }
    //on click of enter it should enter the rooms

    const handleInputEnter = (e) => {
        // console.log(e.code);this will tel show whcih key we have press


        if (e.code === 'Enter') {
            joinRoom();
        }
    }

    return (
        <div className='homePageWrapper'>
            <div className='bgGlow glowTop'></div>
            <div className='bgGlow glowBottom'></div>

            <div className='formWrapper'>
                <div className='brandHeader'>
                    <div className='brandLogo'>
                        <svg
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2.2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <polyline points='16 18 22 12 16 6' />
                            <polyline points='8 6 2 12 8 18' />
                        </svg>
                    </div>
                    <div className='brandMeta'>
                        <h2 className='brandTitle'>CodeSync</h2>
                        <span className='brandBadge'>Realtime Editor</span>
                    </div>
                </div>

                <h4 className='mainLabel'>paste invitation Room Id</h4>

                <div className='inputGroup'>
                    <div className='inputFieldWrapper'>
                        <input
                            type='text'
                            className='inputBox'
                            placeholder='Room ID'
                            onChange={(e) => setRoomId(e.target.value)}
                            value={roomId}
                            onKeyUp={handleInputEnter}
                            autoComplete='off'
                            spellCheck='false'
                        />
                    </div>

                    <div className='inputFieldWrapper'>
                        <input
                            type='text'
                            className='inputBox'
                            placeholder='Username'
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            onKeyUp={handleInputEnter}
                            autoComplete='off'
                            spellCheck='false'
                        />
                    </div>

                    <button className='btn joinBtn' onClick={joinRoom}>
                        Join
                    </button>

                    <span className='createInfo'>
                        If you don't have an invite then create &nbsp;
                        <a
                            onClick={createNewRoom}
                            href='#new-room'
                            className='createNewBtn'
                        >
                            new room
                        </a>
                    </span>
                </div>
            </div>

            <footer className='footer'>
                <h4>
                    Built with 💛 by{' '}
                    <a href='https://google.com' target='_blank' rel='noreferrer'>
                        ❤️ Raghu
                    </a>
                </h4>
            </footer>
        </div>
    );
};

export default Home;