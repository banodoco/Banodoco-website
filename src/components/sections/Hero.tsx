import { Header } from '@/components/layout/Header';

export const Hero = () => {
  return (
    <section className="h-screen snap-start relative">
      <div className="absolute top-0 left-0 right-0 z-10">
        <Header />
      </div>
      <div className="h-full px-8 md:px-16 flex items-center">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full">
        {/* Text Content */}
        <div className="space-y-8">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-normal leading-[1.1] tracking-tight text-gray-900">
            We want to help the open source AI art ecosystem thrive
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 max-w-xl leading-relaxed">
            We're building tools and nurturing a culture to inspire, empower and reward open collaboration in the AI and digital art ecosystem.
          </p>
        </div>

        {/* Terrarium Image */}
        <div className="flex justify-center lg:justify-end">
          <img
            src="https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=600&h=500&fit=crop&crop=center"
            alt="Terrarium with lush green plants"
            className="w-full max-w-lg h-auto rounded-sm shadow-lg"
          />
        </div>
      </div>
      </div>
    </section>
  );
};
