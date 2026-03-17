import Image from 'next/image';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    image?: string;
}

export default function PageHeader({ title, subtitle, image }: PageHeaderProps) {
    return (
        <div className="relative py-24 px-8 bg-primary text-white text-center overflow-hidden">
            {image && (
                <div className="absolute top-0 left-0 w-full h-full opacity-20">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                    />
                </div>
            )}
            <div className="relative z-10 max-w-4xl mx-auto">
                <h1 className="font-serif text-4xl md:text-5xl font-bold mb-6 tracking-wide">{title}</h1>
                {subtitle && (
                    <p className="font-sans text-lg md:text-xl opacity-90 max-w-2xl mx-auto leading-relaxed font-light">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
