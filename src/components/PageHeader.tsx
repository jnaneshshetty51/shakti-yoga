import Image from 'next/image';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    image?: string;
}

export default function PageHeader({ title, subtitle, image }: PageHeaderProps) {
    return (
        <div className="relative py-16 sm:py-24 px-4 sm:px-8 bg-primary text-white text-center overflow-hidden">
            {image && (
                <div className="absolute top-0 left-0 w-full h-full opacity-20">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        className="object-cover"
                        sizes="100vw"
                    />
                </div>
            )}
            <div className="relative z-10 mx-auto w-full max-w-4xl">
                <h1 className="w-full font-serif text-[1.9rem] font-bold leading-tight mb-4 sm:mb-6 sm:text-4xl md:text-5xl">{title}</h1>
                {subtitle && (
                    <p className="mx-auto w-full max-w-2xl font-sans text-base opacity-90 leading-relaxed font-light sm:text-lg md:text-xl">
                        {subtitle}
                    </p>
                )}
            </div>
        </div>
    );
}
