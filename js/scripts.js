function createBinary() {
    const binary = document.createElement('div');
    binary.classList.add('binary');

    // "0" 또는 "1"을 무작위로 생성
    const binaryText = Math.random() > 0.5 ? "0" : "1";
    binary.textContent = binaryText;

    // 랜덤 위치 설정 (가로와 세로 모두)
    binary.style.left = `${Math.random() * 100}vw`;
    binary.style.top = `${Math.random() * 100}vh`;

    // 애니메이션 속도와 크기 설정
    binary.style.fontSize = `${Math.random() * 2 + 1}rem`; // 1rem ~ 3rem 크기
    binary.style.animationDuration = `${Math.random() * 10 + 5}s`; // 5초 ~ 15초 지속

    document.body.appendChild(binary);

    // 일정 시간이 지나면 제거
    setTimeout(() => {
        binary.remove();
    }, 15000); // 15초 후 제거
}

// 500ms마다 새로운 이진수를 생성
setInterval(createBinary, 500);
