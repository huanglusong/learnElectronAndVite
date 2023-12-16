import { Plugin } from "vite";
interface FeatureTestOption {

}

export default (option: FeatureTestOption): Plugin => {

    return {
        name: 'featureTest',
        options: (curOpt) => {
            console.log('通用钩子options被调用！参数为：',curOpt)
            console.log('==========================================================')
        },
        buildStart:(curOpt)=>{
            console.log('通用钩子buildStart被调用！参数为：',curOpt)
            console.log('==========================================================')
        },
        buildEnd:()=>{
            console.log('通用钩子buildEnd被调用！')
            console.log('==========================================================')
        },
        closeBundle:()=>{
            console.log('通用钩子closeBundle被调用！')
            console.log('==========================================================')
        },
        config:(cfg,env)=>{
            console.log('vite特有的钩子config被调用！参数config为：',cfg,'参数env为：',env)
            console.log('==========================================================')
        },
        configResolved:(cfg)=>{
            console.log('vite特有的钩子configResolve被调用！参数config为：',cfg)
            console.log('==========================================================')
        },
        configureServer:(server)=>{
            console.log('vite特有的钩子configureServer被调用！参数server：',server)
            console.log('==========================================================')
        }
    }
}