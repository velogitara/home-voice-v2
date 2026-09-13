type VolumeMeterProps = {
    volume: number;
};

export function VolumeMeter({ volume }: VolumeMeterProps) {
    const fillWidth = `${volume * 100}%`; //  volume находится между 0 и 1, ширина должна быть строкой вроде "42%"

    return (
        <div className="volume-meter">
            <div className="volume-meter__fill" style={{ width: fillWidth }} />
        </div>
    );
}
